import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";

const getColor = (highlight) => {
  switch (highlight) {
    case "full": return "bg-green-200 hover:bg-green-300";
    case "partial": return "bg-yellow-200 hover:bg-yellow-300";
    case "none": return "bg-red-200 hover:bg-red-300";
    default: return "";
  }
};

export default function AIExaminerPrototype() {
  const [text, setText] = useState("");
  const [feedback, setFeedback] = useState([]);
  const [diagramFile, setDiagramFile] = useState(null);
  const [diagramFeedback, setDiagramFeedback] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("answer", text);
      if (diagramFile) formData.append("diagram", diagramFile);

      const res = await fetch("/api/mark-answer", {
        method: "POST",
        body: formData
      });
      const data = await res.json();
      setFeedback(data.feedback);
      setDiagramFeedback(data.diagramFeedback);
    } catch (error) {
      console.error("Error marking answer:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">AQA Economics AI Examiner</h1>

      <Textarea
        rows={6}
        placeholder="Paste your answer here..."
        value={text}
        onChange={(e) => setText(e.target.value)}
      />

      <div>
        <label className="block text-sm font-medium mb-1">Upload Diagram (optional)</label>
        <input
          type="file"
          accept="image/*,application/pdf"
          onChange={(e) => setDiagramFile(e.target.files?.[0] || null)}
        />
      </div>

      <Button onClick={handleSubmit} disabled={loading}>
        {loading ? "Marking..." : "Mark My Answer"}
      </Button>

      {feedback.length > 0 && (
        <Card>
          <CardContent className="space-y-4 mt-4">
            <h2 className="text-xl font-semibold">Marked Answer with Heatmap</h2>
            <div className="space-y-2">
              {feedback.map(({ sentence, highlight, comment }, i) => (
                <motion.div
                  key={i}
                  className={`rounded p-2 ${getColor(highlight)} cursor-pointer`}
                  whileHover={{ scale: 1.02 }}
                  title={comment}
                >
                  {sentence}
                </motion.div>
              ))}
            </div>
            {diagramFeedback && (
              <div className="mt-6">
                <h3 className="text-lg font-semibold">Diagram Feedback</h3>
                <p>{diagramFeedback}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
