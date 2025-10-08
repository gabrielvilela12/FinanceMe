// src/lib/colors.ts

// Mapeamento de categorias comuns para cores específicas
const PREDEFINED_CATEGORY_COLORS: { [key: string]: string } = {
  'Alimentação': '#EF5350',
  'Transporte': '#42A5F5',
  'Moradia': '#66BB6A',
  'Lazer': '#FF7043',
  'Saúde': '#AB47BC',
  'Educação': '#26A69A',
  'Compras': '#FFCA28',
};

/**
 * Gera um hash numérico a partir de uma string.
 * @param str A string para gerar o hash.
 * @returns Um número de hash.
 */
const simpleHash = (str: string): number => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Converte para um inteiro de 32bit
  }
  return Math.abs(hash);
};

/**
 * Retorna uma cor consistente para uma determinada categoria.
 * Se a categoria for pré-definida, retorna a cor mapeada.
 * Caso contrário, gera uma cor proceduralmente para garantir distinção.
 * @param category O nome da categoria.
 * @returns Uma string de cor HSL.
 */
export const getCategoryColor = (category?: string | null): string => {
  if (!category) {
    return '#E0E0E0'; // Cor padrão para categoria indefinida
  }

  if (PREDEFINED_CATEGORY_COLORS[category]) {
    return PREDEFINED_CATEGORY_COLORS[category];
  }

  const hash = simpleHash(category);
  // Usa o ângulo dourado (aproximadamente 137.5 graus) para gerar matizes bem distribuídas
  const hue = (hash * 137.508) % 360;
  
  // Mantém a saturação e a luminosidade em valores que geram cores vibrantes e legíveis
  const saturation = 70;
  const lightness = 50;

  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
};