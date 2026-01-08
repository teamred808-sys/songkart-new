import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Upload, FileText, AlertTriangle, CheckCircle, ExternalLink } from "lucide-react";
import { useUploadOwnershipProof, useSellerContentFlags } from "@/hooks/useContentReview";
import { useAuth } from "@/hooks/useAuth";

export function OwnershipProofUpload() {
  const { user } = useAuth();
  const { data: flaggedSongs, isLoading } = useSellerContentFlags(user?.id);
  const uploadProof = useUploadOwnershipProof();
  const [uploadingSongId, setUploadingSongId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>, songId: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingSongId(songId);
    uploadProof.mutate(
      { songId, file },
      {
        onSettled: () => {
          setUploadingSongId(null);
          if (fileInputRef.current) {
            fileInputRef.current.value = "";
          }
        },
      }
    );
  };

  if (isLoading) return null;

  if (!flaggedSongs?.length) return null;

  return (
    <Card className="border-yellow-500/50 bg-yellow-500/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-yellow-600">
          <AlertTriangle className="h-5 w-5" />
          Content Flagged for Review
        </CardTitle>
        <CardDescription>
          Some of your uploads have been flagged for potential copyright or plagiarism issues.
          Please upload proof of ownership for the following songs.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {flaggedSongs.map((song) => (
          <div
            key={song.id}
            className="flex items-center justify-between p-4 bg-background rounded-lg border"
          >
            <div className="flex items-center gap-4">
              {song.cover_image_url ? (
                <img
                  src={song.cover_image_url}
                  alt={song.title}
                  className="h-12 w-12 rounded object-cover"
                />
              ) : (
                <div className="h-12 w-12 rounded bg-muted flex items-center justify-center">
                  <FileText className="h-6 w-6 text-muted-foreground" />
                </div>
              )}
              <div>
                <p className="font-medium">{song.title}</p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge
                    variant={song.content_check_status === "blocked" ? "destructive" : "secondary"}
                    className={
                      song.content_check_status === "flagged"
                        ? "bg-yellow-500/20 text-yellow-600"
                        : ""
                    }
                  >
                    {song.content_check_status === "blocked" ? "Blocked" : "Flagged"}
                  </Badge>
                  {song.requires_ownership_proof && !song.ownership_proof_url && (
                    <Badge variant="outline" className="text-yellow-600">
                      Proof Required
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {song.ownership_proof_url ? (
                <div className="flex items-center gap-2">
                  <Badge variant="default" className="gap-1 bg-green-600">
                    <CheckCircle className="h-3 w-3" />
                    Proof Uploaded
                  </Badge>
                  <Button size="sm" variant="outline" asChild>
                    <a href={song.ownership_proof_url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4 mr-1" />
                      View
                    </a>
                  </Button>
                </div>
              ) : song.requires_ownership_proof ? (
                <div className="relative">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    onChange={(e) => handleFileSelect(e, song.id)}
                    disabled={uploadingSongId === song.id}
                  />
                  <Button
                    size="sm"
                    disabled={uploadingSongId === song.id}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    {uploadingSongId === song.id ? "Uploading..." : "Upload Proof"}
                  </Button>
                </div>
              ) : null}
            </div>
          </div>
        ))}

        <Alert>
          <FileText className="h-4 w-4" />
          <AlertTitle>Acceptable Proof Documents</AlertTitle>
          <AlertDescription>
            Upload documents proving you own the rights to this content, such as:
            <ul className="list-disc list-inside mt-2 text-sm">
              <li>Original composition certificates</li>
              <li>Publishing agreements</li>
              <li>License transfer documents</li>
              <li>Screenshots of original creation dates</li>
            </ul>
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}