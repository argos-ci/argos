import { Button } from "./Button";

type TablePaginationProps = {
  currentPage: number;
  totalPages: number;
  displayFrom: number;
  displayTo: number;
  totalCount: number;
  itemLabel: string;
  onPrevious: () => void;
  onNext: () => void;
};

export function TablePagination(props: TablePaginationProps) {
  return (
    <div className="mt-3 flex items-center justify-between text-sm">
      <div className="text-low">
        Showing {props.displayFrom}-{props.displayTo} of {props.totalCount}{" "}
        {props.itemLabel}
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="secondary"
          size="small"
          onPress={props.onPrevious}
          isDisabled={props.currentPage <= 1}
        >
          Previous
        </Button>
        <div className="text-low px-2 tabular-nums">
          {props.currentPage} / {props.totalPages}
        </div>
        <Button
          variant="secondary"
          size="small"
          onPress={props.onNext}
          isDisabled={props.currentPage >= props.totalPages}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
