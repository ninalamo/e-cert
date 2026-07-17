import TemplatesList from "@/features/templates/components/templates-list";

export default function TemplatesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Templates</h1>
        <p className="text-muted-foreground text-sm">
          Manage your certificate templates
        </p>
      </div>
      <TemplatesList />
    </div>
  );
}
