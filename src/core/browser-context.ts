export interface ExtensionContextLike {
  inIncognitoContext?: boolean;
}

export function isIncognitoExtensionContext(context: ExtensionContextLike | undefined): boolean {
  return context?.inIncognitoContext === true;
}
