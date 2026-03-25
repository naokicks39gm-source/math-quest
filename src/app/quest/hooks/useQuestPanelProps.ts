import { useQuestHeaderProps } from "./useQuestHeaderProps";
import { useQuestUiWiring } from "./useQuestUiWiring";

export function useQuestPanelProps(args: any) {
  const header = useQuestHeaderProps(args.header);
  const ui = useQuestUiWiring({
    ...args.ui,
    headerProps: header.headerProps,
    setMessage: args.setMessage

  });

  return {
    header,
    ui
  };
}
