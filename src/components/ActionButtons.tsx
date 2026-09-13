import React from "react";
import { Button } from "./ui";

interface Props {
  connecting: boolean;
  refreshing: boolean;
  onConnect: () => void;
  onRefresh: () => void;
}

export function ActionButtons({
  connecting,
  refreshing,
  onConnect,
  onRefresh,
}: Props) {
  return (
    <div className="flex flex-wrap gap-2.5">
      <Button variant="primary" loading={connecting} onClick={onConnect}>
        <i className="fa-solid fa-plug-circle-bolt" aria-hidden="true" />
        Reconnect
      </Button>
      <Button loading={refreshing} onClick={onRefresh}>
        <i className="fa-solid fa-arrows-rotate" aria-hidden="true" />
        Refresh Printers
      </Button>
    </div>
  );
}