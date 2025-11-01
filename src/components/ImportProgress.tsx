import { Progress } from "@/components/ui/progress";

interface ImportProgressProps {
  isVisible: boolean;
  current: number;
  total: number;
  message: string;
  type: "goodreads" | "json" | "analysis";
}

export function ImportProgress({ isVisible, current, total, message, type }: ImportProgressProps) {
  if (!isVisible) return null;

  const percentage = total > 0 ? Math.round((current / total) * 100) : 0;
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-card p-6 rounded-lg shadow-lg border min-w-[400px] max-w-[500px]">
        <div className="space-y-4">
          <div className="text-center">
            <h3 className="text-lg font-semibold">
              {type === "goodreads" ? "Importing GoodReads CSV" : 
               type === "json" ? "Importing JSON" : 
               "Analyzing & Enriching Books"}
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              {message}
            </p>
          </div>
          
          <div className="space-y-2">
            <Progress value={percentage} className="w-full" />
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>{current} / {total} books</span>
              <span>{percentage}%</span>
            </div>
          </div>
          
          {type === "goodreads" && (
            <p className="text-xs text-muted-foreground text-center">
              Enriching books with OpenLibrary data...
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
