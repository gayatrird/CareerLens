export const analyzeResumeAndJD = async (resumeText, jdText) => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 2000));

  // The prompt structure you will send to the AI backend (e.g., Claude or OpenAI):
  /*
  You are an ATS and technical recruiter expert.
  
  Input: 
  RESUME: ${resumeText}
  JOB DESCRIPTION: ${jdText}
  
  The AI must return a JSON object with:
  1. matchScore: A number out of 100
  2. matchReason: A one-line reason for the score
  3. skillsComparison: Array of objects { skill: string, status: 'yes' | 'no' | 'partial' }
  4. missingKeywords: Array of top 5 missing keywords strings, ranked by importance
  5. bulletRewrites: Array of 3 objects { original: string, rewritten: string } (only rephrase, never invent experience)
  6. coverLetter: A 120-word tailored cover letter draft
  */

  // Mock response for now
  return {
    matchScore: 68,
    matchReason: "Solid foundational skills, but missing key backend integrations like REST APIs.",
    skillsComparison: [
      { skill: "JavaScript", status: "yes" },
      { skill: "React", status: "yes" },
      { skill: "REST APIs", status: "no" },
      { skill: "Node.js", status: "partial" },
      { skill: "System Design", status: "no" }
    ],
    missingKeywords: ["REST APIs", "Microservices", "Docker", "AWS", "Agile"],
    bulletRewrites: [
      {
        original: "Made a website using React and HTML.",
        rewritten: "Developed a responsive web application leveraging React and modern HTML5, enhancing user engagement."
      },
      {
        original: "Fixed bugs in the backend.",
        rewritten: "Debugged and resolved backend server issues, improving overall system stability."
      },
      {
        original: "Worked with databases to store user data.",
        rewritten: "Designed and implemented database schemas for secure and efficient user data storage."
      }
    ],
    coverLetter: "Dear Hiring Manager,\n\nI am writing to express my strong interest in the Software Development Engineer Intern position at your esteemed fintech company. With a solid foundation in modern web technologies including JavaScript and React, I have consistently demonstrated an ability to build responsive and user-centric applications.\n\nWhile my current experience is heavily frontend-focused, I am an exceptionally fast learner eager to bridge the gap in REST API integration and backend architecture. During my recent projects, I have cultivated a strong problem-solving mindset and a dedication to clean, maintainable code.\n\nI am excited by the prospect of contributing to your innovative platform while expanding my technical repertoire. Thank you for considering my application.\n\nSincerely,\n[Your Name]"
  };
};
