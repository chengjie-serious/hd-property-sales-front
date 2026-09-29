export function amenityMarkerText(typeLabel: string | undefined, typeCode: string): string {
  return typeLabel?.charAt(0) || typeCode.charAt(0) || '设';
}
