import { useMemo } from "react";
import { useQuestHeaderProps } from "./useQuestHeaderProps";
import { useQuestUiWiring } from "./useQuestUiWiring";

export function useQuestPanelProps(args: any) {
  const header = useQuestHeaderProps(args.header);

  const uiArgs = useMemo(() => {
    return {
      ...args.ui,
      headerProps: header.headerProps,
      setMessage: args.setMessage
    };
  }, [
    args.ui,
    header.headerProps,
    args.setMessage
  ]);

  const ui = useQuestUiWiring(uiArgs);

  const panelProps = useMemo(() => {
    return {
      header,
      ui
    };
  }, [header, ui]);

  return panelProps;
}