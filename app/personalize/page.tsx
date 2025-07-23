"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, ArrowRight, Check, Eye, BarChart2, Brain, Database, Cpu, User } from "lucide-react"
import { cn } from "@/lib/utils"

const roles = [
  { name: "Data Analyst", desc: "Transform data into actionable insights", icon: <BarChart2 /> },
  { name: "Data Scientist", desc: "Uncover insights from complex datasets", icon: <Brain /> },
  { name: "Data Engineer", desc: "Build robust data infrastructure and pipelines", icon: <Database /> },
  { name: "ML Engineer", desc: "Build and deploy intelligent systems", icon: <Cpu /> },
]

const interests = [
  "LLMs",
  "Snowflake",
  "Computer Vision",
  "Robotics",
  "Cloud AI",
  "Data Visualization",
  "AI Agents",
  "Edge Computing",
  "Quantum Computing",
  "Blockchain",
  "AutoML",
  "NLP",
  "Time Series",
  "Deep Learning",
  "Feature Engineering",
  "Data Warehousing",
]

const StepIndicator = ({ currentStep }: { currentStep: number }) => (
  <div className="flex items-center justify-center gap-4">
    {[1, 2, 3].map((step) => (
      <div
        key={step}
        className={cn(
          "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold",
          currentStep > step
            ? "bg-primary text-primary-foreground"
            : currentStep === step
              ? "bg-primary text-primary-foreground"
              : "bg-gray-200 text-gray-500",
        )}
      >
        {currentStep > step ? <Check className="w-4 h-4" /> : step}
      </div>
    ))}
  </div>
)

export default function PersonalizePage() {
  const [step, setStep] = useState(1)
  const [selectedRole, setSelectedRole] = useState("")
  const [selectedInterests, setSelectedInterests] = useState<string[]>([])

  const toggleInterest = (interest: string) => {
    setSelectedInterests((prev) => (prev.includes(interest) ? prev.filter((i) => i !== interest) : [...prev, interest]))
  }

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="text-center max-w-3xl mx-auto">
            <Eye className="h-12 w-12 text-primary mx-auto mb-4" />
            <h1 className="text-3xl font-bold mb-2">What's your role?</h1>
            <p className="text-muted-foreground mb-8">Help us understand how you work with data</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              {roles.map((role) => (
                <Card
                  key={role.name}
                  onClick={() => {
                    setSelectedRole(role.name)
                    // TODO: Persist role selection
                  }}
                  className={cn(
                    "p-4 text-left cursor-pointer hover:border-primary",
                    selectedRole === role.name && "border-primary ring-2 ring-primary",
                  )}
                >
                  <div className="flex items-start gap-4">
                    <div className="text-primary">{role.icon}</div>
                    <div>
                      <h3 className="font-semibold">{role.name}</h3>
                      <p className="text-sm text-muted-foreground">{role.desc}</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
            <Card className="p-4 text-left">
              <div className="flex items-center gap-4">
                <User className="text-muted-foreground" />
                <Input
                  placeholder="Founder, Consultant, Product Manager, etc."
                  className="border-none focus-visible:ring-0"
                />
              </div>
            </Card>
          </div>
        )
      case 2:
        return (
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-3xl font-bold mb-2">Your tech interests</h1>
            <p className="text-muted-foreground mb-8">Select the technologies and trends you want to follow</p>
            <Card className="p-6 bg-white">
              <div className="flex flex-wrap gap-3 justify-center mb-6">
                {interests.map((interest) => (
                  <Badge
                    key={interest}
                    onClick={() => {
                      toggleInterest(interest)
                      // TODO: Persist interest selection
                    }}
                    variant={selectedInterests.includes(interest) ? "default" : "secondary"}
                    className="px-4 py-2 text-sm cursor-pointer"
                  >
                    {interest}
                  </Badge>
                ))}
              </div>
              <h3 className="text-left font-semibold mb-2">Other Interests:</h3>
              <Input placeholder="The more information you provide, the better your personalization..." />
            </Card>
          </div>
        )
      case 3:
        return (
          <div className="text-center max-w-2xl mx-auto">
            <h1 className="text-3xl font-bold mb-2">Your projects & priorities</h1>
            <p className="text-muted-foreground mb-8">Tell us what you're working on to get more relevant insights</p>
            <Card className="p-6 bg-white">
              <h3 className="text-left font-semibold mb-2">Current Projects & Priorities:</h3>
              <Textarea
                placeholder="e.g., Building an agentic RAG pipeline, implementing computer vision for manufacturing QA, migrating to modern data stack..."
                rows={5}
              />
              <Button
                size="lg"
                className="w-full mt-4"
                onClick={() => {
                  setStep(4)
                  // TODO: Submit all personalization data to the backend, e.g., POST /api/personalize
                }}
              >
                Continue <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Card>
          </div>
        )
      default:
        return null
    }
  }

  return (
    <div className="flex flex-col h-full p-8">
      <div className="flex-grow flex items-center justify-center">{renderStep()}</div>
      <footer className="flex items-center justify-between mt-8">
        <Button variant="ghost" onClick={() => setStep((s) => Math.max(1, s - 1))} disabled={step === 1}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          {step === 1 ? "Skip" : "Previous"}
        </Button>
        <StepIndicator currentStep={step} />
        <Button onClick={() => setStep((s) => Math.min(3, s + 1))} disabled={step === 3}>
          Next <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </footer>
    </div>
  )
}
