export const generateDistinctDarkColors = (count: number): string[] => {
  const colors = [];
  const hueStep = 360 / count;
  const saturation = 100; // Full saturation for vivid colors
  const lightness = 50; // Low lightness for dark colors

  for (let i = 0; i < count; i++) {
    const hue = i * hueStep;
    const color = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
    colors.push(color);
  }

  return colors;
};
