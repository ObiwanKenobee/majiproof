# MajiProof 🌍
### Visual Intelligence for Rural Water Infrastructure

**Don't just report the repair. Show what changed.**

MajiProof is a multimodal AI platform designed to transform field photographs into structured infrastructure inspections and evidence-based repair comparisons.

Built for the **Meta Global AI Developer Hackathon 2026**, MajiProof explores how frontier AI and computer vision can improve the transparency and accountability of rural water infrastructure maintenance.

---

## 💧 The Problem

Rural water infrastructure is essential to community resilience, public health and sustainable development.

However, maintenance workflows often depend on fragmented photographs, technician reports and manual inspections. This makes it difficult for NGOs, water-service organizations and infrastructure supervisors to establish:

- What went wrong?
- Which infrastructure components were affected?
- What maintenance was performed?
- What visibly changed after the repair?
- What evidence is still missing?
- Does the infrastructure require further inspection?

Reporting a repair is not the same as demonstrating what changed.

## 🚀 Our Solution

**MajiProof turns field observations into visual intelligence and accountable inspection evidence.**

Using multimodal AI and computer vision, the platform helps field workers and infrastructure supervisors:

1. Capture before-repair evidence.
2. Analyse visual conditions using AI.
3. Identify and segment relevant infrastructure components.
4. Capture after-repair evidence.
5. Compare observable changes.
6. Generate structured inspection reports.
7. Submit findings for human review and approval.

Our goal is to make infrastructure maintenance more transparent, interpretable and evidence-driven.

---

## 🧠 Powered by Meta AI

MajiProof is built around two complementary AI capabilities.

### Meta Muse Spark 1.3

The visual reasoning layer.

Designed to:
- Interpret infrastructure photographs.
- Identify visible components and conditions.
- Highlight potential maintenance concerns.
- Generate structured inspection observations.
- Propose relevant segmentation prompts.
- Compare before-and-after evidence.

### Meta Segment Anything Model 3.1 (SAM 3.1)

The computer vision layer.

Designed to:
- Identify relevant infrastructure objects.
- Generate pixel-level segmentation masks.
- Produce bounding boxes.
- Isolate selected components.
- Support visual comparison and inspection.

Together, these capabilities enable MajiProof to move beyond conventional image descriptions into interpretable visual inspection workflows.

### Inference Infrastructure

The architecture is designed to support experimentation with:

| Partner | Intended role |
|---|---|
| Meta Model API | Primary Muse Spark and SAM inference |
| Fireworks AI | Alternative open-weight model inference and evaluation |
| Baseten | Scalable model inference |
| Modal | GPU computing and asynchronous processing |

Alternative provider integrations are optional and should only be considered operational once their endpoints have been configured and successfully tested.

---

## ⚙️ How It Works

```text
       FIELD EVIDENCE
       Photographs / Videos
               |
               v
       MUSE SPARK 1.3
       Visual Understanding
               |
               v
         SAM 3.1
       Object Segmentation
               |
               v
     BEFORE / AFTER COMPARISON
       Observable Changes
               |
               v
       EVIDENCE ENGINE
       Findings & Uncertainty
               |
               v
        HUMAN REVIEW
               |
               v
      INSPECTION REPORT
```

### Core Workflow

| Stage | Capability |
|---|---|
| Capture | Upload infrastructure photographs |
| Understand | Interpret visible conditions |
| Segment | Identify and isolate relevant objects |
| Compare | Evaluate before-and-after evidence |
| Review | Examine AI findings and limitations |
| Report | Generate structured inspection documentation |

---

## ✨ Key Features

- **Multimodal inspection:** AI-assisted understanding of infrastructure imagery.
- **Visual segmentation:** Actual object masks and bounding boxes through SAM 3.1.
- **Before-and-after analysis:** Compare evidence to identify observable changes.
- **Structured findings:** Convert unstructured photographs into organized inspection records.
- **Human-in-the-loop verification:** Keep AI observations separate from human decisions.
- **Inspection reporting:** Produce evidence-oriented maintenance reports.
- **Provider-independent architecture:** Support alternative inference providers through modular adapters.
- **Responsive interface:** Designed for field workers and infrastructure supervisors.

*Feature availability depends on the current implementation and configured model integrations.*

---

## 🛠️ Technology Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js, React |
| Language | TypeScript |
| Styling | Tailwind CSS |
| AI reasoning | Meta Muse Spark |
| Computer vision | Meta SAM 3.1 |
| Validation | Zod |
| Local persistence | IndexedDB |
| Reporting | jsPDF |
| Deployment | Vercel |
| Optional inference | Fireworks, Baseten, Modal |

---

## 🏗️ Getting Started

### Prerequisites

- Node.js (LTS recommended)
- npm
- Git
- Meta Model API credentials

Optional credentials are required only when using additional inference providers.

### 1. Clone the repository

```bash
git clone https://github.com/ObiwanKenobee/majiproof.git

cd majiproof
```

Replace the repository URL if the project is published under a different repository name.

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Create a `.env.local` file in the project root.

```env
# Primary Meta inference
META_API_KEY=your_meta_api_key

# Optional alternative inference providers
FIREWORKS_API_KEY=
BASETEN_API_KEY=
MODAL_API_KEY=
```

Only configure optional provider credentials when the corresponding integration is implemented.

Never expose API credentials through client-side environment variables or commit secrets to GitHub.

### 4. Run the application

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

### 5. Build for production

```bash
npm run build
```

Run the production application:

```bash
npm start
```

---

## 🔐 Architecture & Security

MajiProof follows several engineering principles:

- API credentials remain server-side.
- Image uploads are validated.
- AI responses are validated against structured schemas.
- Provider-specific implementations are separated from business logic.
- Model failures must never produce fabricated inspection results.
- Uploaded evidence should be handled with appropriate privacy safeguards.
- Human decisions remain distinct from AI-generated observations.

### Evidence Integrity

MajiProof distinguishes between:

**Observation:** What is visibly present in the submitted photograph.

**Inference:** What the AI believes may explain the observed condition.

**Recommendation:** What should be investigated or inspected next.

**Verification:** What a human reviewer has approved based on the available evidence.

A photograph showing water flow does not establish water potability, supply capacity or long-term infrastructure reliability.

MajiProof is an inspection-support platform, not a substitute for engineering certification or laboratory water-quality testing.

---

## 🌍 Our Vision

We are starting with rural water infrastructure, but the underlying approach has wider applications in climate resilience and essential infrastructure management.

Potential future applications include:

- Water distribution networks.
- Borehole and pump maintenance.
- Agricultural irrigation systems.
- Urban drainage inspections.
- Flood infrastructure assessment.
- Renewable energy infrastructure.
- Environmental restoration monitoring.

Our long-term ambition is to make AI more useful in the physical world by connecting observations, evidence, decisions and measurable outcomes.

---

## 🎯 Built For

**Meta Global AI Developer Hackathon 2026**

Project theme: Build for Your World.

This project explores how Meta's multimodal AI and computer vision capabilities can address practical infrastructure challenges in underserved communities.

---

## 🤝 Contributing

We welcome collaboration around:

- Multimodal AI.
- Computer vision.
- Infrastructure monitoring.
- Climate technology.
- Rural water systems.
- Evidence-based decision support.
- Open-source software engineering.

Contributions should prioritize technical reliability, evidence quality, transparency and practical impact.

---

## 📌 Project Status

MajiProof is a hackathon-stage project.

Model integrations, deployment status and individual capabilities should be assessed against the current repository and tested implementation.

We are continuing to develop the product architecture, improve model orchestration and evaluate its real-world applicability.

---

## 🌱 Our Principle

**OBSERVE → UNDERSTAND → SEGMENT → COMPARE → VERIFY → LEARN**

Don't just report the repair.

# **SHOW WHAT CHANGED.**

**MajiProof — Visual Intelligence for Rural Water Infrastructure.**
