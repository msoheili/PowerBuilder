export interface CustomTemplate {
  id: string;
  name: string;
  description?: string;
  template: string;
  format: string;
  created_at: string;
  updated_at: string;
}

export interface CustomTemplateCreate {
  name: string;
  description?: string;
  template: string;
  format: string;
}

export interface CustomTemplateUpdate {
  name?: string;
  description?: string;
  template?: string;
  format?: string;
}

const BASE_URL = "/api/v1/ppt/custom-templates";

export async function listCustomTemplates(): Promise<CustomTemplate[]> {
  const res = await fetch(BASE_URL);
  if (!res.ok) throw new Error("Failed to fetch templates");
  return res.json();
}

export async function getCustomTemplate(id: string): Promise<CustomTemplate> {
  const res = await fetch(`${BASE_URL}/${id}`);
  if (!res.ok) throw new Error("Failed to fetch template");
  return res.json();
}

export async function createCustomTemplate(data: CustomTemplateCreate): Promise<CustomTemplate> {
  const res = await fetch(BASE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to create template");
  return res.json();
}

export async function updateCustomTemplate(id: string, data: CustomTemplateUpdate): Promise<CustomTemplate> {
  const res = await fetch(`${BASE_URL}/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to update template");
  return res.json();
}

export async function deleteCustomTemplate(id: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete template");
} 