"""Process-local math-SDPA guard installed AFTER fixed Comfy imports.

No torch import or CUDA initialization here. Dependencies are supplied by the
trial process / CPU regression harness. Never edits shared Comfy source.
"""
import functools


class MathAttentionPolicy:
    def __init__(self, torch, kitchen, ops, attention, wan, t5):
        self.torch, self.kitchen, self.ops = torch, kitchen, ops
        self.attention, self.wan, self.t5 = attention, wan, t5
        self.math = torch.nn.attention.SDPBackend.MATH
        self.original_sdpa = ops.scaled_dot_product_attention
        self.original_attention = attention.attention_pytorch
        assert attention.optimized_attention is self.original_attention, 'Comfy selected a non-PyTorch attention entry'
        assert attention.optimized_attention_masked is self.original_attention, 'Masked attention entry differs'
        assert wan.optimized_attention is self.original_attention, 'Wan imported a different attention entry'
        assert t5.optimized_attention_for_device is attention.optimized_attention_for_device, 'T5 routing differs'

        # Apply after known Comfy imports; any later drift is rejected below.
        torch.backends.cuda.enable_flash_sdp(False)
        torch.backends.cuda.enable_mem_efficient_sdp(False)
        torch.backends.cuda.enable_cudnn_sdp(False)
        torch.backends.cuda.enable_math_sdp(True)
        for name in kitchen.list_backends():
            if name != 'eager': kitchen.registry.disable(name)
        kitchen.registry.set_priority(['eager'])
        if hasattr(ops, 'SDPA_BACKEND_PRIORITY'):
            # Fixed Comfy's large-input wrapper re-enables this list in an inner
            # sdpa_kernel context; global flags alone would not constrain it.
            ops.SDPA_BACKEND_PRIORITY = [self.math]

        @functools.wraps(self.original_sdpa)
        def guarded_sdpa(*args, **kwargs):
            self.assert_intact()
            with torch.nn.attention.sdpa_kernel([self.math]):
                self.assert_intact()
                return self.original_sdpa(*args, **kwargs)

        @functools.wraps(self.original_attention)
        def guarded_attention(*args, **kwargs):
            self.assert_intact()
            options = kwargs.get('transformer_options') or {}
            assert 'optimized_attention_override' not in options, 'Unreviewed attention override prohibited'
            preferred = kwargs.get('preferred_attention')
            if preferred is not None:
                assert any(preferred.function is allowed for allowed in (None, self.original_attention, guarded_attention)), 'Non-PyTorch preferred attention prohibited'
            return self.original_attention(*args, **kwargs)

        self.guarded_sdpa, self.guarded_attention = guarded_sdpa, guarded_attention
        ops.scaled_dot_product_attention = guarded_sdpa
        attention.attention_pytorch = guarded_attention
        attention.optimized_attention = guarded_attention
        attention.optimized_attention_masked = guarded_attention
        wan.optimized_attention = guarded_attention
        self.assert_intact()

    def state(self):
        cuda = self.torch.backends.cuda
        return {'math': cuda.math_sdp_enabled(), 'flash': cuda.flash_sdp_enabled(),
                'memoryEfficient': cuda.mem_efficient_sdp_enabled(), 'cudnn': cuda.cudnn_sdp_enabled(),
                'comfyPriority': [str(x) for x in getattr(self.ops, 'SDPA_BACKEND_PRIORITY', [])],
                'nonEagerAvailable': [k for k in self.kitchen.list_backends() if k != 'eager' and self.kitchen.registry.is_available(k)],
                'sdpaGuardInstalled': hasattr(self,'guarded_sdpa') and self.ops.scaled_dot_product_attention is self.guarded_sdpa,
                'wanGuardInstalled': hasattr(self,'guarded_attention') and self.wan.optimized_attention is self.guarded_attention}

    def assert_intact(self):
        s = self.state()
        # Preserve the failed guard and strengthen it to include cuDNN/dispatch.
        assert s['math'] and not s['flash'] and not s['memoryEfficient'] and not s['cudnn'], 'Math-only SDPA state violated: ' + str(s)
        assert not s['nonEagerAvailable'], 'Accelerated kitchen backend was re-enabled'
        if hasattr(self.ops, 'SDPA_BACKEND_PRIORITY'):
            assert self.ops.SDPA_BACKEND_PRIORITY == [self.math], 'Comfy SDPA priority was changed'
        if hasattr(self, 'guarded_sdpa'):
            assert self.ops.scaled_dot_product_attention is self.guarded_sdpa, 'SDPA call guard replaced'
            assert self.attention.attention_pytorch is self.guarded_attention
            assert self.attention.optimized_attention is self.guarded_attention
            assert self.attention.optimized_attention_masked is self.guarded_attention
            assert self.wan.optimized_attention is self.guarded_attention, 'Wan attention alias changed'
            assert self.t5.optimized_attention_for_device is self.attention.optimized_attention_for_device
        return s
