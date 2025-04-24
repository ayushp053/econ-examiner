const rawContent = textResponse.choices[0].message.content || '';
const jsonStart = rawContent.indexOf('[');
const jsonEnd = rawContent.lastIndexOf(']') + 1;

let feedback = [];
try {
  feedback = JSON.parse(rawContent.slice(jsonStart, jsonEnd));
} catch (err) {
  console.error('Failed to parse feedback JSON:', err);
}
// TODO: Add code here
