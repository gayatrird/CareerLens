# CareerLens

## AI-Powered Career Intelligence Platform

CareerLens is an AI-powered career intelligence platform that helps users analyze resumes, match them with job opportunities, explore career paths, and prepare for interviews.

### Core & Planned Capabilities

- **AI Resume + Job Matching**: Autonomous agent screening from ATS, recruiter, and hiring manager perspectives with deep keyword gap analysis and STAR-method bullet rewrites.
- **AI Career Navigator** *(Planned)*: Explore personalized career trajectories, target role skill requirements, and step-by-step career path progression.
- **AI Mock Interview** *(Planned)*: Comprehensive interview preparation with tailored behavioral, technical, and project-specific questions and AI response evaluations.

---

### Tech Stack

- **Frontend**: React 19, Tailwind CSS v4, Vite
- **AI / LLM**: Groq (Llama 3.3 70B Versatile) / Gemini API
- **Document Parsing**: PDF.js, Mammoth (DOCX)
- **Authentication**: Firebase Authentication (optional Google Sign-In)

---

### Getting Started

#### Prerequisites
- Node.js (v18 or higher)
- npm or yarn

#### Installation

```bash
npm install
```

#### Environment Setup

Create a `.env` file in the root directory based on `.env.example`:

```bash
VITE_GROQ_API_KEY=your_groq_api_key_here
```

#### Running the Development Server

```bash
npm run dev
```

#### Building for Production

```bash
npm run build
```
