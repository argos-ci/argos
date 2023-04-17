import { Button } from "./Button";

interface PaginationProps {
  pageInfo: {
    totalCount: number;
    hasNextPage: boolean;
  };
  first: number;
  after: number;
  handlePageChange: (after: number) => void;
}

export const Pagination: React.FC<PaginationProps> = ({
  pageInfo,
  first,
  after,
  handlePageChange,
}) => {
  const currentPage = after / first + 1;
  if (pageInfo.totalCount <= first) return null;

  return (
    <div className="flex items-center justify-between">
      <Button
        color="neutral"
        variant="outline"
        size="small"
        onClick={() => handlePageChange(after - first)}
        disabled={after === 0}
      >
        Previous
      </Button>
      <span>
        Page {currentPage} of {Math.ceil(pageInfo.totalCount / first)}
      </span>
      <Button
        color="neutral"
        variant="outline"
        size="small"
        onClick={() => handlePageChange(after + first)}
        disabled={!pageInfo.hasNextPage}
      >
        Next
      </Button>
    </div>
  );
};
