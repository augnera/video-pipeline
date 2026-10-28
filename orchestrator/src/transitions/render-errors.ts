/** Classify the actual first-line error message; never match dependency/directory names in a stack. */
export function isGlRenderFailure(detail:string){
 const message=detail.trim().split(/\r?\n/,1)[0];
 return /(?:^|\s)gl-transitions:|\bWebGL\b|\bCanvasDrawElement\b|\bCONTEXT_LOST\b|\b(?:fragment|vertex) shader\b/i.test(message);
}
