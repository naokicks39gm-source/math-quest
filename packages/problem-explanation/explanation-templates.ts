export const DEFAULT_EXPLANATION = "式を計算します";

export const explanationTemplates: Record<string, (variables: Record<string, number>) => string> = {
  "E1-ADD-BASIC": (variables) =>
    `${variables.a} + ${variables.b}

そのままたします

${variables.a} + ${variables.b}
=
${variables.a + variables.b}`,
  "E1-ADD-MAKE10": (variables) => {
    const to10 = 10 - variables.a;
    const rest = variables.b - to10;

    return `${variables.a} + ${variables.b}

まず10を作ります

${variables.a} + ${variables.b}
↓
${variables.a} + ${to10} + ${rest}
↓
10 + ${rest}
↓
${variables.a + variables.b}`;
  }
};
