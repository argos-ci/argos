import { Button } from "./Button";

interface PaginationProps {
  pageInfo: {
    totalCount: number;
    hasNextPage: boolean;
  };
  first: number;
  after: number;
  onPageChange: (after: number) => void;
}

export const Pagination: React.FC<PaginationProps> = ({
  pageInfo,
  first,
  after,
  onPageChange,
}) => {
  if (pageInfo.totalCount <= first) {
    return null;
  }

  return (
    <div className="flex items-center justify-between">
      <Button
        color="neutral"
        variant="outline"
        size="small"
        onClick={() => onPageChange(after - first)}
        disabled={after === 0}
      >
        Previous
      </Button>
      <span>
        Page {after / first + 1} of {Math.ceil(pageInfo.totalCount / first)}
      </span>
      <Button
        color="neutral"
        variant="outline"
        size="small"
        onClick={() => onPageChange(after + first)}
        disabled={!pageInfo.hasNextPage}
      >
        Next
      </Button>
    </div>
  );
};
