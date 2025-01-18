"use client";

import React, { useState, useEffect, forwardRef, useImperativeHandle, useRef } from 'react';
import { Folder, FolderOpen, Pencil, Trash2, ChevronRight, ChevronDown, X, AlertCircle, Plus, File, Download } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface Element {
  id: string;
  name: string;
  page_id: string;
  selector_type: string;
  selector_value: string;
  action_type: string;
  action_value: string;
}

interface Page {
  id: string;
  name: string;
  project_id: string;
  elements?: Element[];
}

interface Project {
  id: string;
  name: string;
  pages?: Page[];
}

interface DeleteModalProps {
  isOpen: boolean;
  projectName: string;
  onConfirm: () => void;
  onCancel: () => void;
}

interface JavaFileParseResult {
  pageName: string;
  elements: {
    name: string;
    selector_type: string;
    selector_value: string;
  }[];
  failedElements: string[];
}

interface LoadingState {
  total: number;
  current: number;
  fileName: string;
}

interface ProjectTreeProps {
  isCompact?: boolean;
}

const DeleteModal = ({ isOpen, projectName, onConfirm, onCancel }: DeleteModalProps) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="p-6">
          <div className="flex items-center gap-3 text-red-600 mb-4">
            <AlertCircle className="w-6 h-6" />
            <h3 className="text-lg font-semibold">Projeyi Sil</h3>
          </div>
          <p className="text-gray-600 mb-1">Bu işlem geri alınamaz.</p>
          <p className="text-gray-600 mb-4">
            <span className="font-medium">{projectName}</span> projesini silmek istediğinizden emin misiniz?
          </p>
          <div className="flex items-center justify-end gap-3">
            <button
              onClick={onCancel}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              İptal
            </button>
            <button
              onClick={onConfirm}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Sil
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export const ProjectTree = forwardRef(({ isCompact = false }: ProjectTreeProps, ref) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [tempSelectorValue, setTempSelectorValue] = useState('');
  const [tempActionValue, setTempActionValue] = useState('');
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
  const [expandedPages, setExpandedPages] = useState<Set<string>>(new Set());
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; id: string; name: string; type: 'project' | 'page' }>({
    isOpen: false,
    id: '',
    name: '',
    type: 'project'
  });
  const [editingElement, setEditingElement] = useState<{
    id: string | null;
    selectorValue: string;
    actionValue: string;
  }>({
    id: null,
    selectorValue: '',
    actionValue: ''
  });
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState<LoadingState | null>(null);

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    const { data, error } = await supabase
      .from('projects')
      .select(`
        *,
        pages (
          *,
          elements (*)
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching projects:', error);
      return;
    }

    const sortedData = data?.map(project => ({
      ...project,
      pages: project.pages?.map(page => ({
        ...page,
        elements: page.elements?.sort((a, b) => {
          const aTime = new Date(a.created_at || 0).getTime();
          const bTime = new Date(b.created_at || 0).getTime();
          return aTime - bTime;
        })
      })).sort((a, b) => {
        const aTime = new Date(a.created_at || 0).getTime();
        const bTime = new Date(b.created_at || 0).getTime();
        return aTime - bTime;
      })
    }));

    setProjects(sortedData || []);
  };

  useImperativeHandle(ref, () => ({
    addProject: async (name: string) => {
      const { error } = await supabase
        .from('projects')
        .insert([{ name }]);

      if (error) {
        console.error('Error creating project:', error);
        return;
      }

      fetchProjects();
    }
  }));

  const handleDeleteClick = (item: Project | Page, type: 'project' | 'page') => {
    setDeleteModal({
      isOpen: true,
      id: item.id,
      name: item.name,
      type
    });
  };

  const handleDeleteConfirm = async () => {
    const { error } = await supabase
      .from(deleteModal.type === 'project' ? 'projects' : 'pages')
      .delete()
      .eq('id', deleteModal.id);

    if (error) {
      console.error(`Error deleting ${deleteModal.type}:`, error);
      return;
    }

    setDeleteModal({ isOpen: false, id: '', name: '', type: 'project' });
    fetchProjects();
  };

  const handleAddElement = async (pageId: string) => {
    const { error } = await supabase
      .from('elements')
      .insert([{
        name: 'New Element',
        page_id: pageId,
        selector_type: 'id',
        selector_value: 'element',
        action_type: 'click',
        action_value: '',
        created_at: new Date().toISOString()
      }]);

    if (error) {
      console.error('Error creating element:', error);
      return;
    }

    setExpandedPages(prev => new Set(prev).add(pageId));
    fetchProjects();
  };

  const togglePage = (pageId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedPages(prev => {
      const next = new Set(prev);
      if (next.has(pageId)) {
        next.delete(pageId);
      } else {
        next.add(pageId);
      }
      return next;
    });
  };

  const startEditing = (item: Project | Page) => {
    setEditingId(item.id);
    setEditName(item.name);
  };

  const saveName = async (id: string, type: 'project' | 'page') => {
    const { error } = await supabase
      .from(type === 'project' ? 'projects' : 'pages')
      .update({ name: editName })
      .eq('id', id);

    if (error) {
      console.error(`Error updating ${type}:`, error);
      return;
    }

    setEditingId(null);
    setEditName('');
    fetchProjects();
  };

  const toggleProject = (projectId: string) => {
    setExpandedProjects(prev => {
      const next = new Set(prev);
      if (next.has(projectId)) {
        next.delete(projectId);
      } else {
        next.add(projectId);
      }
      return next;
    });
  };

  const handleDeleteElement = async (elementId: string) => {
    if (!confirm('Bu elementi silmek istediğinizden emin misiniz?')) return;

    const { error } = await supabase
      .from('elements')
      .delete()
      .eq('id', elementId);

    if (error) {
      console.error('Error deleting element:', error);
      return;
    }

    fetchProjects();
  };

  const handleElementUpdate = async (element: Element, updates: Partial<Element>) => {
    if ((updates.selector_value !== undefined && !updates.selector_value.trim()) ||
        (updates.action_value !== undefined && !updates.action_value.trim())) {
      return;
    }

    const updatedElement = {
      ...element,
      ...updates,
      created_at: element.created_at
    };

    if (updates.action_type && updates.action_type !== 'type') {
      updatedElement.action_value = '';
    }

    const { error } = await supabase
      .from('elements')
      .update(updatedElement)
      .eq('id', element.id);

    if (error) {
      console.error('Error updating element:', error);
      return;
    }

    if (updates.name) {
      setEditingId(null);
      setEditName('');
    }

    fetchProjects();
  };

  const handleAddPage = async (projectId: string) => {
    // Mevcut sayfaları kontrol et
    const { data: existingPages } = await supabase
      .from('pages')
      .select('name')
      .eq('project_id', projectId);

    const newPageName = 'New Page';
    
    // Eğer "New Page" varsa, numaralandır
    if (existingPages?.some(p => p.name === newPageName)) {
      let counter = 1;
      while (existingPages?.some(p => p.name === `${newPageName} ${counter}`)) {
        counter++;
      }
      const uniqueName = `${newPageName} ${counter}`;
      
      const { error } = await supabase
        .from('pages')
        .insert([{ 
          name: uniqueName,
          project_id: projectId
        }]);

      if (error) {
        console.error('Error creating page:', error);
        return;
      }
    } else {
      const { error } = await supabase
        .from('pages')
        .insert([{ 
          name: newPageName,
          project_id: projectId
        }]);

      if (error) {
        console.error('Error creating page:', error);
        return;
      }
    }

    setExpandedProjects(prev => new Set(prev).add(projectId));
    fetchProjects();
  };

  const formatElementName = (name: string): string => {
    // İlk harfi büyük yap ve camelCase'i boşluklarla ayır
    return name
      // Her büyük harften önce boşluk ekle
      .replace(/([A-Z])/g, ' $1')
      // Baştaki boşluğu kaldır ve ilk harfi büyük yap
      .trim()
      .replace(/^\w/, c => c.toUpperCase());
  };

  const parseJavaFile = (content: string): JavaFileParseResult | null => {
    try {
      const pageNameMatch = content.match(/public class (\w+)Model/);
      if (!pageNameMatch) return null;
      const pageName = pageNameMatch[1];

      const elements: JavaFileParseResult['elements'] = [];
      const failedElements: string[] = [];
      const lines = content.split('\n');

      for (const line of lines) {
        const trimmedLine = line.trim();
        if (!trimmedLine || trimmedLine.startsWith("//") || trimmedLine.startsWith("/*")) continue;

        if (trimmedLine.includes("By.") && trimmedLine.includes("public static")) {
          const elementMatch = trimmedLine.match(/public static By ([a-zA-ZğĞüÜşŞıİöÖçÇ\w]+)\s*=\s*By\.(\w+)\s*\("((?:[^"\\]|\\.)*)"\)/);
          
          if (elementMatch) {
            const [_, name, rawSelectorType, escapedSelectorValue] = elementMatch;
            const selectorValue = escapedSelectorValue.replace(/\\(.)/g, '$1');
            
            let selector_type = 'id';
            switch (rawSelectorType) {
              case 'id':
                selector_type = 'ID';
                break;
              case 'cssSelector':
                selector_type = 'CSS Selector';
                break;
              case 'xpath':
                selector_type = 'XPath';
                break;
            }

            elements.push({
              name: formatElementName(name),
              selector_type,
              selector_value: selectorValue
            });
          } else {
            const nameMatch = trimmedLine.match(/public static By ([a-zA-ZğĞüÜşŞıİöÖçÇ\w]+)/);
            if (nameMatch) {
              failedElements.push(nameMatch[1]);
            }
          }
        }
      }

      return {
        pageName,
        elements,
        failedElements
      };
    } catch (error) {
      console.error('Error parsing Java file:', error);
      return null;
    }
  };

  const handleFileUpload = async (projectId: string, files: FileList) => {
    setSelectedProjectId(projectId);
    
    const { data: existingPages } = await supabase
      .from('pages')
      .select('name')
      .eq('project_id', projectId);

    const existingPageNames = new Set(existingPages?.map(p => p.name) || []);
    
    setLoading({
      total: files.length,
      current: 0,
      fileName: ''
    });

    let allElements = [];
    let failedElementsReport: { fileName: string; pageName: string; elements: string[] }[] = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.name.endsWith('.java')) {
        setLoading(prev => prev ? {
          ...prev,
          current: prev.current + 1
        } : null);
        continue;
      }

      setLoading(prev => prev ? {
        ...prev,
        fileName: file.name
      } : null);

      const content = await file.text();
      const parseResult = parseJavaFile(content);
      
      if (!parseResult) {
        console.error('Could not parse file:', file.name);
        setLoading(prev => prev ? {
          ...prev,
          current: prev.current + 1
        } : null);
        continue;
      }

      if (parseResult.failedElements.length > 0) {
        failedElementsReport.push({
          fileName: file.name,
          pageName: parseResult.pageName,
          elements: parseResult.failedElements
        });
      }

      if (existingPageNames.has(parseResult.pageName)) {
        alert(`"${parseResult.pageName}" isimli sayfa zaten mevcut. Bu dosya atlanacak: ${file.name}`);
        setLoading(prev => prev ? {
          ...prev,
          current: prev.current + 1
        } : null);
        continue;
      }

      const { data: pageData, error: pageError } = await supabase
        .from('pages')
        .insert([{
          name: parseResult.pageName,
          project_id: projectId,
          created_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (pageError) {
        console.error('Error creating page:', pageError);
        setLoading(prev => prev ? {
          ...prev,
          current: prev.current + 1
        } : null);
        continue;
      }

      existingPageNames.add(parseResult.pageName);

      const pageElements = parseResult.elements.map(element => ({
        name: element.name,
        page_id: pageData.id,
        selector_type: element.selector_type,
        selector_value: element.selector_value,
        action_type: 'click',
        action_value: '',
        created_at: new Date().toISOString()
      }));

      allElements.push(...pageElements);

      if (allElements.length >= 100 || i === files.length - 1) {
        if (allElements.length > 0) {
          const { error: elementsError } = await supabase
            .from('elements')
            .insert(allElements);

          if (elementsError) {
            console.error('Error creating elements:', elementsError);
          }

          allElements = [];
        }
      }

      setLoading(prev => prev ? {
        ...prev,
        current: prev.current + 1
      } : null);
    }

    setLoading(null);
    setSelectedProjectId(null);

    if (failedElementsReport.length > 0) {
      let message = 'Aşağıdaki elementler işlenemedi:\n\n';
      failedElementsReport.forEach(report => {
        message += `${report.fileName} (${report.pageName}):\n`;
        report.elements.forEach(element => {
          message += `- ${element}\n`;
        });
        message += '\n';
      });
      alert(message);
    }

    fetchProjects();
  };

  return (
    <>
      <div className="mt-6 border rounded-lg overflow-hidden">
        <div className="bg-gray-50 px-4 py-3 border-b">
          <div className="flex justify-between items-center">
            <h2 className="text-sm font-medium text-gray-700">Proje Gezgini</h2>
            {loading && (
              <div className="flex items-center gap-3 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
                  <span>Dosya İşleniyor: {loading.fileName}</span>
                </div>
                <div className="text-gray-400">
                  ({loading.current}/{loading.total})
                </div>
              </div>
            )}
          </div>
        </div>
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          multiple
          accept=".java"
          onChange={(e) => {
            if (e.target.files && selectedProjectId) {
              handleFileUpload(selectedProjectId, e.target.files);
            }
          }}
        />
        <div className="divide-y">
          {projects.map(project => {
            const isExpanded = expandedProjects.has(project.id);
            const pages = project.pages || [];
            const totalElements = pages.reduce((sum, page) => sum + (page.elements?.length || 0), 0);
            
            return (
              <div key={project.id} className="bg-white">
                <div 
                  className="group flex items-center gap-2 px-4 py-3 hover:bg-gray-50 cursor-pointer select-none"
                  onClick={() => toggleProject(project.id)}
                >
                  <div className="flex items-center gap-2 flex-1">
                    <div className="flex items-center gap-1.5">
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-gray-400" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      )}
                      {isExpanded ? (
                        <FolderOpen className="w-5 h-5 text-yellow-500" />
                      ) : (
                        <Folder className="w-5 h-5 text-yellow-500" />
                      )}
                    </div>
                    
                    {editingId === project.id ? (
                      <div className="flex items-center gap-2 flex-1 bg-white rounded-lg shadow-sm border px-2 py-1">
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="flex-1 px-2 py-1 text-sm focus:outline-none text-gray-900 placeholder-gray-400 bg-transparent"
                          placeholder="Proje adı"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && editName.trim()) saveName(project.id, 'project');
                            if (e.key === 'Escape') setEditingId(null);
                          }}
                          onClick={(e) => e.stopPropagation()}
                          autoFocus
                        />
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            editName.trim() && saveName(project.id, 'project');
                          }}
                          className="text-sm text-blue-600 hover:text-blue-700 px-2 py-1 rounded hover:bg-blue-50"
                        >
                          Kaydet
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingId(null);
                          }}
                          className="text-sm text-gray-400 hover:text-gray-600 px-2 py-1 rounded hover:bg-gray-100"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <span className="flex-1 text-sm font-medium text-gray-700">
                        {project.name}
                        <span className="ml-2 text-xs text-gray-400">
                          ({pages.length} sayfa • {totalElements} element)
                        </span>
                      </span>
                    )}
                  </div>
                  
                  {!editingId && (
                    <div className="hidden group-hover:flex items-center gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedProjectId(project.id);
                          fileInputRef.current?.click();
                        }}
                        className="p-1.5 text-gray-400 hover:text-green-600 rounded-lg hover:bg-green-50"
                        title="Add to Cucumber"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAddPage(project.id);
                        }}
                        className="p-1.5 text-gray-400 hover:text-green-600 rounded-lg hover:bg-green-50"
                        title="Sayfa Ekle"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          startEditing(project);
                        }}
                        className="p-1.5 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-blue-50"
                        title="Düzenle"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteClick(project, 'project');
                        }}
                        className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50"
                        title="Sil"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
                {isExpanded && (
                  <div className="border-t">
                    {pages.map(page => {
                      const isPageExpanded = expandedPages.has(page.id);
                      const elements = page.elements || [];

                      return (
                        <div key={page.id}>
                          <div 
                            className="group flex items-center gap-2 px-4 py-2 hover:bg-gray-50 pl-12 cursor-pointer"
                            onClick={(e) => togglePage(page.id, e)}
                          >
                            <div className="flex items-center gap-2 flex-1">
                              <div className="flex items-center gap-1.5">
                                {isPageExpanded ? (
                                  <ChevronDown className="w-4 h-4 text-gray-400" />
                                ) : (
                                  <ChevronRight className="w-4 h-4 text-gray-400" />
                                )}
                                <File className="w-4 h-4 text-blue-500" />
                              </div>

                              {editingId === page.id ? (
                                <div className="flex items-center gap-2 flex-1 bg-white rounded-lg shadow-sm border px-2 py-1">
                                  <input
                                    type="text"
                                    value={editName}
                                    onChange={(e) => setEditName(e.target.value)}
                                    className="flex-1 px-2 py-1 text-sm focus:outline-none text-gray-900 placeholder-gray-400 bg-transparent"
                                    placeholder="Sayfa adı"
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter' && editName.trim()) saveName(page.id, 'page');
                                      if (e.key === 'Escape') setEditingId(null);
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                    autoFocus
                                  />
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      editName.trim() && saveName(page.id, 'page');
                                    }}
                                    className="text-sm text-blue-600 hover:text-blue-700 px-2 py-1 rounded hover:bg-blue-50"
                                  >
                                    Kaydet
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setEditingId(null);
                                    }}
                                    className="text-sm text-gray-400 hover:text-gray-600 px-2 py-1 rounded hover:bg-gray-100"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                </div>
                              ) : (
                                <span className="flex-1 text-sm text-gray-600">
                                  {page.name}
                                  <span className="ml-2 text-xs text-gray-400">
                                    ({elements.length} element)
                                  </span>
                                </span>
                              )}
                            </div>

                            {!editingId && (
                              <div className="hidden group-hover:flex items-center gap-1">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleAddElement(page.id);
                                  }}
                                  className="p-1.5 text-gray-400 hover:text-green-600 rounded-lg hover:bg-green-50"
                                  title="Element Ekle"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    startEditing(page);
                                  }}
                                  className="p-1.5 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-blue-50"
                                  title="Düzenle"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteClick(page, 'page');
                                  }}
                                  className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50"
                                  title="Sil"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}
                          </div>

                          {isPageExpanded && (
                            <div className="pl-20 py-1">
                              {elements.map(element => (
                                <div 
                                  key={element.id}
                                  className="group flex items-center gap-3 px-4 py-2 hover:bg-gray-50 text-sm text-gray-600"
                                  draggable
                                  onDragStart={(e) => {
                                    const elementData = `${page.name}.${element.name}`;
                                    e.dataTransfer.setData('text/plain', elementData);
                                    e.currentTarget.classList.add('opacity-50');
                                  }}
                                  onDragEnd={(e) => {
                                    e.currentTarget.classList.remove('opacity-50');
                                  }}
                                >
                                  <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                                  
                                  {editingId === element.id ? (
                                    <div className="flex items-center gap-2 flex-1">
                                      <input
                                        type="text"
                                        value={editName}
                                        onChange={(e) => setEditName(e.target.value)}
                                        className="w-[180px] px-2 py-1 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="Element adı"
                                        autoFocus
                                      />
                                      <button
                                        onClick={() => editName.trim() && handleElementUpdate(element, { name: editName })}
                                        className="px-2 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded"
                                      >
                                        Kaydet
                                      </button>
                                      <button
                                        onClick={() => setEditingId(null)}
                                        className="p-1 text-gray-400 hover:text-gray-600 rounded hover:bg-gray-100"
                                      >
                                        <X className="w-4 h-4" />
                                      </button>
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-3 flex-1">
                                      <span className="w-[180px] truncate cursor-move">{element.name}</span>
                                      
                                      {!isCompact && (
                                        <div className="flex items-center gap-2 ml-4">
                                          <select
                                            value={element.selector_type}
                                            onChange={(e) => handleElementUpdate(element, { selector_type: e.target.value })}
                                            className="w-[100px] px-2 py-1 text-sm border rounded bg-white"
                                          >
                                            <option value="ID">ID</option>
                                            <option value="CSS Selector">CSS Selector</option>
                                            <option value="XPath">XPath</option>
                                          </select>

                                          <input
                                            type="text"
                                            value={editingElement.id === element.id ? editingElement.selectorValue : element.selector_value}
                                            onChange={(e) => {
                                              setEditingElement(prev => ({
                                                ...prev,
                                                id: element.id,
                                                selectorValue: e.target.value
                                              }));
                                            }}
                                            onFocus={() => {
                                              setEditingElement({
                                                id: element.id,
                                                selectorValue: element.selector_value,
                                                actionValue: element.action_value || ''
                                              });
                                            }}
                                            onBlur={(e) => {
                                              if (e.target.value.trim() !== element.selector_value) {
                                                handleElementUpdate(element, { selector_value: e.target.value.trim() });
                                              }
                                              setEditingElement(prev => ({ ...prev, id: null }));
                                            }}
                                            className="w-[240px] px-2 py-1 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            placeholder="Selector değeri"
                                          />

                                          <select
                                            value={element.action_type}
                                            onChange={(e) => handleElementUpdate(element, { action_type: e.target.value })}
                                            className="w-[100px] px-2 py-1 text-sm border rounded bg-white"
                                          >
                                            <option value="click">Click</option>
                                            <option value="type">Type</option>
                                            <option value="hover">Hover</option>
                                            <option value="clear">Clear</option>
                                          </select>

                                          {element.action_type === 'type' && (
                                            <input
                                              type="text"
                                              value={editingElement.id === element.id ? editingElement.actionValue : element.action_value || ''}
                                              onChange={(e) => {
                                                setEditingElement(prev => ({
                                                  ...prev,
                                                  id: element.id,
                                                  actionValue: e.target.value
                                                }));
                                              }}
                                              onFocus={() => {
                                                setEditingElement({
                                                  id: element.id,
                                                  selectorValue: element.selector_value,
                                                  actionValue: element.action_value || ''
                                                });
                                              }}
                                              onBlur={(e) => {
                                                if (e.target.value.trim() !== element.action_value) {
                                                  handleElementUpdate(element, { action_value: e.target.value.trim() });
                                                }
                                                setEditingElement(prev => ({ ...prev, id: null }));
                                              }}
                                              className="w-[180px] px-2 py-1 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                              placeholder="Action değeri"
                                            />
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  )}

                                  {!editingId && (
                                    <div className="hidden group-hover:flex items-center gap-1">
                                      <button
                                        onClick={() => {
                                          setEditingId(element.id);
                                          setEditName(element.name);
                                        }}
                                        className="p-1 text-gray-400 hover:text-blue-600 rounded hover:bg-blue-50"
                                        title="Düzenle"
                                      >
                                        <Pencil className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        onClick={() => handleDeleteElement(element.id)}
                                        className="p-1 text-gray-400 hover:text-red-600 rounded hover:bg-red-50"
                                        title="Sil"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  )}
                                </div>
                              ))}
                              {elements.length === 0 && (
                                <div className="px-4 py-2 text-sm text-gray-500 italic">
                                  Bu sayfada henüz element yok
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {pages.length === 0 && (
                      <div className="px-12 py-3 text-sm text-gray-500 italic">
                        Bu projede henüz sayfa yok
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
          {projects.length === 0 && (
            <div className="px-4 py-8 text-center text-sm text-gray-500">
              Henüz hiç proje yok. Yeni bir proje oluşturmak için "Yeni Proje" butonuna tıklayın.
            </div>
          )}
        </div>
      </div>

      <DeleteModal
        isOpen={deleteModal.isOpen}
        projectName={`${deleteModal.name} ${deleteModal.type === 'page' ? 'sayfasını' : 'projesini'}`}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteModal({ isOpen: false, id: '', name: '', type: 'project' })}
      />
    </>
  );
}); 