import React, { useState, useEffect } from "react";
import { useSearchParams } from "wouter";
import { UploadCloud, CheckCircle, Loader2, AlertCircle, FileText } from "lucide-react";
import SiteHeader from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

// ─── File processing ───────────────────────────────────────────────────────────

async function processFileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      const base64 = result.includes(",") ? result.split(",")[1] : result;
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ─── Main Component ─────────────────────────────────────────────────────────────

export default function UploadTaxFormPage() {
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const token = searchParams.get("token") || "";

  const [step, setStep] = useState<"upload" | "success" | "error">("upload");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (!token) {
      setErrorMsg("No upload token found in the URL. Please use the link sent to your email.");
      setStep("error");
    }
  }, [token]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] || null;
    if (f && f.size > 10 * 1024 * 1024) {
      toast({ title: "File Too Large", description: "Maximum file size is 10 MB.", variant: "destructive" });
      return;
    }
    setFile(f);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      toast({ title: "Select a File", description: "Please choose your Multi-State Tax Form before submitting.", variant: "destructive" });
      return;
    }
    setUploading(true);
    setErrorMsg("");
    try {
      const base64 = await processFileToBase64(file);
      const res = await fetch("/api/tax-form/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          taxFormFileName: file.name,
          taxFormFileData: base64,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      setStep("success");
    } catch (err: any) {
      setErrorMsg(err.message || "Upload failed. Please try again.");
      setStep("error");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="max-w-xl mx-auto px-4 py-12">
        <Card className="bg-card border-border shadow-2xl">
          <CardContent className="p-8">
            {step === "success" ? (
              <div className="text-center space-y-4 py-8">
                <div className="flex justify-center">
                  <div className="rounded-full bg-green-500/20 p-4">
                    <CheckCircle className="w-12 h-12 text-green-500" />
                  </div>
                </div>
                <h1 className="text-2xl font-bold text-primary font-display">Upload Received!</h1>
                <p className="text-muted-foreground">
                  Your Multi-State Tax Form has been submitted for review. We will be in touch if we need anything.
                </p>
                <p className="text-sm text-muted-foreground">
                  Questions? Email us at <a href="mailto:info@dubdub22.com" className="text-primary underline">info@dubdub22.com</a>
                </p>
              </div>
            ) : step === "error" ? (
              <div className="text-center space-y-4 py-8">
                <div className="flex justify-center">
                  <div className="rounded-full bg-red-500/20 p-4">
                    <AlertCircle className="w-12 h-12 text-red-500" />
                  </div>
                </div>
                <h1 className="text-2xl font-bold font-display text-primary">Unable to Upload</h1>
                <p className="text-muted-foreground">{errorMsg}</p>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3 mb-6">
                  <div className="rounded-full bg-primary/10 p-2.5">
                    <FileText className="w-5 h-5 text-primary" />
                  </div>
                  <h1 className="text-xl font-bold font-display text-primary">Upload Your Tax Form</h1>
                </div>
                <p className="text-muted-foreground text-sm mb-6">
                  Please upload your Multi-State Tax Form or Certificate of Resale. We will review it and reach out if we need any changes.
                </p>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium">
                      Multi-State Tax Form or Certificate of Resale
                    </label>
                    <div className={file ? "border-2 border-primary bg-primary/5 rounded-lg p-6 text-center cursor-pointer transition-colors" : "border-2 border-border hover:border-primary/50 rounded-lg p-6 text-center cursor-pointer transition-colors"}>
                      <input
                        type="file"
                        accept=".pdf,.png,.jpg,.jpeg"
                        onChange={handleFileChange}
                        className="hidden"
                        id="tax-form-file"
                      />
                      <label htmlFor="tax-form-file" className="cursor-pointer flex flex-col items-center gap-2">
                        {file ? (
                          <React.Fragment>
                            <CheckCircle className="w-8 h-8 text-primary" />
                            <span className="text-sm font-medium text-primary">{file.name}</span>
                            <span className="text-xs text-muted-foreground">Click to change file</span>
                          </React.Fragment>
                        ) : (
                          <React.Fragment>
                            <UploadCloud className="w-8 h-8 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">Click to select a file</span>
                            <span className="text-xs text-muted-foreground">PDF, PNG, JPG - max 10 MB</span>
                          </React.Fragment>
                        )}
                      </label>
                    </div>
                  </div>
                  <Button
                    type="submit"
                    disabled={!file || uploading}
                    className="w-full text-black bg-primary hover:bg-primary/90"
                  >
                    {uploading ? (
                      <React.Fragment><Loader2 className="w-4 h-4 mr-2 animate-spin" />Uploading...</React.Fragment>
                    ) : (
                      <React.Fragment><UploadCloud className="w-4 h-4 mr-2" />Submit Tax Form</React.Fragment>
                    )}
                  </Button>
                </form>
              </>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
