type AnswerFormat = {
  kind: string;
};

type ExampleItem = {
  answer: string;
};

type TypeDef = {
  answer_format: AnswerFormat;
  example_items?: ExampleItem[];
};

export const isSupportedType = (type: TypeDef) => {
  if (type.answer_format?.kind !== "int") return false;
  const items = type.example_items ?? [];
  if (items.length === 0) return false;
  return items.some((item) => /^\d{1,4}$/.test(item.answer));
};
