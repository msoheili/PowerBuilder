"use client";
import React, { useEffect, useState } from "react";
import {
  listCustomTemplates,
  createCustomTemplate,
  updateCustomTemplate,
  deleteCustomTemplate,
  CustomTemplate,
  CustomTemplateCreate,
  CustomTemplateUpdate,
} from "./api";
import dynamic from "next/dynamic";
import * as yaml from "js-yaml";
import Draggable from "react-draggable";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), { ssr: false });

const emptyForm: CustomTemplateCreate = {
  name: "",
  description: "",
  template: "",
  format: "json",
};

// Add a type for a page in the template
interface TemplatePage {
  name: string;
  layout?: any; // Will be used for graphical editor
  style?: any;
  prompt?: string;
}

// Add a type for a layout element
interface LayoutElement {
  id: string;
  type: 'text' | 'image' | 'shape';
  x: number;
  y: number;
  width: number;
  height: number;
  content?: string;
  style?: any;
}

// Helper to parse template content
function parseTemplateContent(content: string, format: string): any {
  try {
    if (format === "yaml") return yaml.load(content) || {};
    return JSON.parse(content || '{}');
  } catch {
    return {};
  }
}

// Helper to stringify template content
function stringifyTemplateContent(obj: any, format: string): string {
  try {
    if (format === "yaml") return yaml.dump(obj);
    return JSON.stringify(obj, null, 2);
  } catch {
    return '';
  }
}

// Helper to generate a random id
function randomId() {
  return Math.random().toString(36).slice(2, 10);
}

const CustomTemplatesPage = () => {
  const [templates, setTemplates] = useState<CustomTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<CustomTemplateCreate>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [yamlError, setYamlError] = useState<string | null>(null);
  const [selectedPageIdx, setSelectedPageIdx] = useState<number | null>(null);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [resizing, setResizing] = useState<{ id: string; startX: number; startY: number; startW: number; startH: number } | null>(null);

  const fetchTemplates = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listCustomTemplates();
      setTemplates(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  // Validate YAML when form.template or form.format changes
  useEffect(() => {
    if (form.format === "yaml") {
      try {
        yaml.load(form.template || "");
        setYamlError(null);
      } catch (e: any) {
        setYamlError(e.message);
      }
    } else {
      setYamlError(null);
    }
  }, [form.template, form.format]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleEditorChange = (value: string | undefined) => {
    setForm({ ...form, template: value || "" });
  };

  const handleEdit = (template: CustomTemplate) => {
    setEditingId(template.id);
    setForm({
      name: template.name,
      description: template.description || "",
      template: template.template,
      format: template.format,
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this template?")) return;
    setLoading(true);
    setError(null);
    try {
      await deleteCustomTemplate(id);
      await fetchTemplates();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (editingId) {
        const update: CustomTemplateUpdate = { ...form };
        await updateCustomTemplate(editingId, update);
      } else {
        await createCustomTemplate(form);
      }
      setForm(emptyForm);
      setEditingId(null);
      setShowForm(false);
      await fetchTemplates();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleNew = () => {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(true);
  };

  // Parse pages from template content
  const pages: TemplatePage[] = (() => {
    const parsed = parseTemplateContent(form.template, form.format);
    return Array.isArray(parsed.pages) ? parsed.pages : [];
  })();

  // Add a new page
  const handleAddPage = () => {
    const name = prompt("Enter page name:");
    if (!name) return;
    const newPages = [...pages, { name }];
    const newContent = stringifyTemplateContent({ ...parseTemplateContent(form.template, form.format), pages: newPages }, form.format);
    setForm({ ...form, template: newContent });
    setSelectedPageIdx(newPages.length - 1);
  };

  // Edit a page name
  const handleEditPage = (idx: number) => {
    const name = prompt("Edit page name:", pages[idx].name);
    if (!name) return;
    const newPages = pages.map((p, i) => i === idx ? { ...p, name } : p);
    const newContent = stringifyTemplateContent({ ...parseTemplateContent(form.template, form.format), pages: newPages }, form.format);
    setForm({ ...form, template: newContent });
  };

  // Delete a page
  const handleDeletePage = (idx: number) => {
    if (!window.confirm("Delete this page?")) return;
    const newPages = pages.filter((_, i) => i !== idx);
    const newContent = stringifyTemplateContent({ ...parseTemplateContent(form.template, form.format), pages: newPages }, form.format);
    setForm({ ...form, template: newContent });
    setSelectedPageIdx(null);
  };

  // Select a page
  const handleSelectPage = (idx: number) => {
    setSelectedPageIdx(idx);
  };

  // Get selected page and its layout
  const selectedPage = selectedPageIdx !== null ? pages[selectedPageIdx] : null;
  const layout: LayoutElement[] = selectedPage?.layout || [];

  // Add element to page
  const handleAddElement = (type: LayoutElement['type']) => {
    if (selectedPageIdx === null) return;
    const newElement: LayoutElement = {
      id: randomId(),
      type,
      x: 50,
      y: 50,
      width: 120,
      height: 40,
      content: type === 'text' ? 'Text' : '',
    };
    const newPages = pages.map((p, i) =>
      i === selectedPageIdx ? { ...p, layout: [...(p.layout || []), newElement] } : p
    );
    const newContent = stringifyTemplateContent({ ...parseTemplateContent(form.template, form.format), pages: newPages }, form.format);
    setForm({ ...form, template: newContent });
    setSelectedElementId(newElement.id);
  };

  // Update element property
  const handleElementChange = (id: string, prop: keyof LayoutElement, value: any) => {
    if (selectedPageIdx === null) return;
    const newPages = pages.map((p, i) => {
      if (i !== selectedPageIdx) return p;
      return {
        ...p,
        layout: (p.layout || []).map((el: LayoutElement) =>
          el.id === id ? { ...el, [prop]: value } : el
        ),
      };
    });
    const newContent = stringifyTemplateContent({ ...parseTemplateContent(form.template, form.format), pages: newPages }, form.format);
    setForm({ ...form, template: newContent });
  };

  // Delete element
  const handleDeleteElement = (id: string) => {
    if (selectedPageIdx === null) return;
    const newPages = pages.map((p, i) => {
      if (i !== selectedPageIdx) return p;
      return {
        ...p,
        layout: (p.layout || []).filter((el: LayoutElement) => el.id !== id),
      };
    });
    const newContent = stringifyTemplateContent({ ...parseTemplateContent(form.template, form.format), pages: newPages }, form.format);
    setForm({ ...form, template: newContent });
    setSelectedElementId(null);
  };

  // Handle resize mouse events
  const handleResizeMouseDown = (e: React.MouseEvent, el: LayoutElement) => {
    e.stopPropagation();
    setResizing({ id: el.id, startX: e.clientX, startY: e.clientY, startW: el.width, startH: el.height });
  };

  useEffect(() => {
    if (!resizing) return;
    const handleMouseMove = (e: MouseEvent) => {
      const dx = e.clientX - resizing.startX;
      const dy = e.clientY - resizing.startY;
      handleElementChange(resizing.id, 'width', Math.max(20, resizing.startW + dx));
      handleElementChange(resizing.id, 'height', Math.max(20, resizing.startH + dy));
    };
    const handleMouseUp = () => setResizing(null);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [resizing]);

  return (
    <div style={{ padding: 32 }}>
      <h1 style={{ fontSize: 32, fontWeight: 700 }}>Custom Templates</h1>
      <p style={{ marginBottom: 24 }}>
        Create, edit, and manage your tailored presentation templates here.
      </p>
      {error && <div style={{ color: "red", marginBottom: 16 }}>{error}</div>}
      <button onClick={handleNew} style={{ marginBottom: 16 }}>+ New Template</button>
      {loading && <div>Loading...</div>}
      <div style={{ marginBottom: 32 }}>
        {templates.length === 0 && !loading && <div>No templates found.</div>}
        {templates.map((tpl) => (
          <div key={tpl.id} style={{ border: "1px solid #eee", borderRadius: 8, padding: 16, marginBottom: 16 }}>
            <div style={{ fontWeight: 600 }}>{tpl.name}</div>
            <div style={{ color: "#666", fontSize: 14 }}>{tpl.description}</div>
            <div style={{ fontSize: 12, color: "#999" }}>Format: {tpl.format}</div>
            <div style={{ fontSize: 12, color: "#999" }}>Last updated: {new Date(tpl.updated_at).toLocaleString()}</div>
            <div style={{ marginTop: 8 }}>
              <button onClick={() => handleEdit(tpl)} style={{ marginRight: 8 }}>Edit</button>
              <button onClick={() => handleDelete(tpl.id)} style={{ color: "red" }}>Delete</button>
            </div>
          </div>
        ))}
      </div>
      {showForm && (
        <form onSubmit={handleSubmit} style={{ border: "1px solid #ccc", borderRadius: 8, padding: 24, maxWidth: 800 }}>
          <h2>{editingId ? "Edit Template" : "New Template"}</h2>
          <div style={{ marginBottom: 12 }}>
            <label>Name<br />
              <input name="name" value={form.name} onChange={handleInputChange} required style={{ width: "100%" }} />
            </label>
          </div>
          <div style={{ marginBottom: 12 }}>
            <label>Description<br />
              <input name="description" value={form.description} onChange={handleInputChange} style={{ width: "100%" }} />
            </label>
          </div>
          <div style={{ marginBottom: 12 }}>
            <label>Format<br />
              <select name="format" value={form.format} onChange={handleInputChange} style={{ width: "100%" }}>
                <option value="json">JSON</option>
                <option value="yaml">YAML</option>
              </select>
            </label>
          </div>
          <div style={{ marginBottom: 12 }}>
            <label>Template Content<br />
              <div style={{ border: '1px solid #ddd', borderRadius: 4 }}>
                <MonacoEditor
                  height="300px"
                  defaultLanguage={form.format}
                  language={form.format}
                  value={form.template}
                  onChange={handleEditorChange}
                  options={{ fontSize: 14, minimap: { enabled: false } }}
                />
              </div>
            </label>
            {form.format === "yaml" && yamlError && (
              <div style={{ color: "red", marginTop: 4 }}>YAML Error: {yamlError}</div>
            )}
          </div>
          <div style={{ marginBottom: 24, border: '1px solid #eee', borderRadius: 8, padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
              <b style={{ flex: 1 }}>Pages in Template</b>
              <button type="button" onClick={handleAddPage}>+ Add Page</button>
            </div>
            {pages.length === 0 && <div style={{ color: '#888' }}>No pages yet.</div>}
            <ul style={{ listStyle: 'none', padding: 0 }}>
              {pages.map((page, idx) => (
                <li key={idx} style={{ marginBottom: 4, display: 'flex', alignItems: 'center' }}>
                  <button type="button" onClick={() => handleSelectPage(idx)} style={{ fontWeight: selectedPageIdx === idx ? 'bold' : 'normal', marginRight: 8 }}>
                    {page.name}
                  </button>
                  <button type="button" onClick={() => handleEditPage(idx)} style={{ marginRight: 4 }}>Edit</button>
                  <button type="button" onClick={() => handleDeletePage(idx)} style={{ color: 'red' }}>Delete</button>
                </li>
              ))}
            </ul>
          </div>
          {selectedPage && (
            <div style={{ display: 'flex', gap: 24, marginBottom: 24 }}>
              {/* Canvas */}
              <div style={{ border: '1px solid #bbb', borderRadius: 8, width: 400, height: 300, position: 'relative', background: '#fafafa' }}>
                {layout.map((el) => (
                  <Draggable
                    key={el.id}
                    position={{ x: el.x, y: el.y }}
                    onStart={() => setSelectedElementId(el.id)}
                    onStop={(_, data) => {
                      handleElementChange(el.id, 'x', data.x);
                      handleElementChange(el.id, 'y', data.y);
                    }}
                    bounds="parent"
                  >
                    <div
                      style={{
                        position: 'absolute',
                        width: el.width,
                        height: el.height,
                        border: selectedElementId === el.id ? '2px solid #0070f3' : '1px solid #888',
                        background: el.style?.backgroundColor || (el.type === 'text' ? '#fff' : el.type === 'image' ? '#eee' : '#cce'),
                        color: el.style?.color || '#222',
                        fontSize: el.style?.fontSize || 14,
                        borderRadius: el.style?.borderRadius || 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'move',
                        overflow: 'hidden',
                        boxSizing: 'border-box',
                        zIndex: selectedElementId === el.id ? 2 : 1,
                      }}
                      onClick={() => setSelectedElementId(el.id)}
                    >
                      {el.type === 'text' ? el.content : el.type}
                      {/* Resize handle (bottom-right corner) */}
                      {selectedElementId === el.id && (
                        <div
                          onMouseDown={e => handleResizeMouseDown(e, el)}
                          style={{
                            position: 'absolute',
                            right: 0,
                            bottom: 0,
                            width: 14,
                            height: 14,
                            background: '#0070f3',
                            borderRadius: 3,
                            cursor: 'nwse-resize',
                            zIndex: 3,
                          }}
                        />
                      )}
                    </div>
                  </Draggable>
                ))}
                <div style={{ position: 'absolute', bottom: 8, left: 8, display: 'flex', gap: 8 }}>
                  <button type="button" onClick={() => handleAddElement('text')}>+ Text</button>
                  <button type="button" onClick={() => handleAddElement('image')}>+ Image</button>
                  <button type="button" onClick={() => handleAddElement('shape')}>+ Shape</button>
                </div>
              </div>
              {/* Sidebar for editing selected element */}
              {selectedElementId && (
                <div style={{ minWidth: 220, border: '1px solid #eee', borderRadius: 8, padding: 16 }}>
                  <b>Edit Element</b>
                  {(() => {
                    const el = layout.find((e) => e.id === selectedElementId);
                    if (!el) return null;
                    const style = el.style || {};
                    return (
                      <div>
                        <div style={{ marginBottom: 8 }}>
                          <label>Type: <b>{el.type}</b></label>
                        </div>
                        <div style={{ marginBottom: 8 }}>
                          <label>X: <input type="number" value={el.x} onChange={e => handleElementChange(el.id, 'x', Number(e.target.value))} style={{ width: 60 }} /></label>
                          <label style={{ marginLeft: 8 }}>Y: <input type="number" value={el.y} onChange={e => handleElementChange(el.id, 'y', Number(e.target.value))} style={{ width: 60 }} /></label>
                        </div>
                        <div style={{ marginBottom: 8 }}>
                          <label>Width: <input type="number" value={el.width} onChange={e => handleElementChange(el.id, 'width', Number(e.target.value))} style={{ width: 60 }} /></label>
                          <label style={{ marginLeft: 8 }}>Height: <input type="number" value={el.height} onChange={e => handleElementChange(el.id, 'height', Number(e.target.value))} style={{ width: 60 }} /></label>
                        </div>
                        {el.type === 'text' && (
                          <>
                            <div style={{ marginBottom: 8 }}>
                              <label>Content:<br />
                                <input type="text" value={el.content || ''} onChange={e => handleElementChange(el.id, 'content', e.target.value)} style={{ width: '100%' }} />
                              </label>
                            </div>
                            <div style={{ marginBottom: 8 }}>
                              <label>Text Color:<br />
                                <input type="color" value={style.color || '#222222'} onChange={e => handleElementChange(el.id, 'style', { ...style, color: e.target.value })} />
                              </label>
                            </div>
                            <div style={{ marginBottom: 8 }}>
                              <label>Font Size:<br />
                                <input type="number" min={8} max={72} value={style.fontSize || 14} onChange={e => handleElementChange(el.id, 'style', { ...style, fontSize: Number(e.target.value) })} style={{ width: 60 }} /> px
                              </label>
                            </div>
                          </>
                        )}
                        {/* Style editing */}
                        <div style={{ marginBottom: 8 }}>
                          <label>Background Color:<br />
                            <input type="color" value={style.backgroundColor || '#ffffff'} onChange={e => handleElementChange(el.id, 'style', { ...style, backgroundColor: e.target.value })} />
                          </label>
                        </div>
                        {el.type === 'text' && (
                          <>
                            <div style={{ marginBottom: 8 }}>
                              <label>Text Color:<br />
                                <input type="color" value={style.color || '#222222'} onChange={e => handleElementChange(el.id, 'style', { ...style, color: e.target.value })} />
                              </label>
                            </div>
                            <div style={{ marginBottom: 8 }}>
                              <label>Font Size:<br />
                                <input type="number" min={8} max={72} value={style.fontSize || 14} onChange={e => handleElementChange(el.id, 'style', { ...style, fontSize: Number(e.target.value) })} style={{ width: 60 }} /> px
                              </label>
                            </div>
                          </>
                        )}
                        <div style={{ marginBottom: 8 }}>
                          <button type="button" onClick={() => handleDeleteElement(el.id)} style={{ color: 'red' }}>Delete Element</button>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          )}
          <div>
            <button type="submit" style={{ marginRight: 8 }} disabled={form.format === "yaml" && !!yamlError}>
              {editingId ? "Update" : "Create"}
            </button>
            <button type="button" onClick={() => { setShowForm(false); setEditingId(null); }}>Cancel</button>
          </div>
        </form>
      )}
    </div>
  );
};

export default CustomTemplatesPage; 