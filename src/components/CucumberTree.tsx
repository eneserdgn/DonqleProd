"use client";

import React, { useState, useEffect, DragEvent, useRef } from 'react';
import { Folder, FolderOpen, File, Pencil, Trash2, ChevronRight, ChevronDown, X, AlertCircle, Plus, FileText, BookOpen, FolderInput } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface ScenarioElement {
  id: string;
  scenario_id: string;
  element_name: string;
  action_type?: string;
  action_value?: string;
  created_at?: string;
}

interface Scenario {
  id: string;
  name: string;
  feature_id: string;
  created_at?: string;
  elements?: ScenarioElement[];
}

interface Feature {
  id: string;
  name: string;
  parent_feature_id: string | null;
  created_at?: string;
  features?: Feature[];
  scenarios?: Scenario[];
}

interface DeleteModalProps {
  isOpen: boolean;
  name: string;
  type: 'feature' | 'scenario';
  onConfirm: () => void;
  onCancel: () => void;
}

interface ProcessingStatus {
  total: number;
  current: number;
  step: 'folders' | 'files' | 'scenarios';
  currentItem: string;
}

const DeleteModal = ({ isOpen, name, type, onConfirm, onCancel }: DeleteModalProps) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="p-6">
          <div className="flex items-center gap-3 text-red-600 mb-4">
            <AlertCircle className="w-6 h-6" />
            <h3 className="text-lg font-semibold">{type === 'feature' ? 'Feature' : 'Senaryo'} Sil</h3>
          </div>
          <p className="text-gray-600 mb-1">Bu işlem geri alınamaz.</p>
          <p className="text-gray-600 mb-4">
            <span className="font-medium">{name}</span> {type === 'feature' ? 'feature\'ını' : 'senaryosunu'} silmek istediğinizden emin misiniz?
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

export const CucumberTree = () => {
  const [features, setFeatures] = useState<Feature[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [expandedFeatures, setExpandedFeatures] = useState<Set<string>>(new Set());
  const [tempValues, setTempValues] = useState<Record<string, string>>({});
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; id: string; name: string; type: 'feature' | 'scenario' }>({
    isOpen: false,
    id: '',
    name: '',
    type: 'feature'
  });
  const directoryInputRef = useRef<HTMLInputElement>(null);
  const [processing, setProcessing] = useState<ProcessingStatus | null>(null);
  const [selectedFeatureId, setSelectedFeatureId] = useState<string | null>(null);

  useEffect(() => {
    fetchFeatures();
  }, []);

  const fetchFeatures = async () => {
    const { data, error } = await supabase
      .from('features')
      .select(`
        *,
        features:features(
          *,
          features:features(
            *,
            features:features(
              *,
              features:features(
                *,
                features:features(*),
                scenarios:scenarios(
                  *,
                  elements:scenario_elements(*)
                )
              ),
              scenarios:scenarios(
                *,
                elements:scenario_elements(*)
              )
            ),
            scenarios:scenarios(
              *,
              elements:scenario_elements(*)
            )
          ),
          scenarios:scenarios(
            *,
            elements:scenario_elements(*)
          )
        ),
        scenarios:scenarios(
          *,
          elements:scenario_elements(*)
        )
      `)
      .is('parent_feature_id', null)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching features:', error);
      return;
    }

    setFeatures(data || []);
  };

  const handleAddFeature = async (parentId: string | null = null) => {
    const { data: existingFeatures } = await supabase
      .from('features')
      .select('name')
      .eq('parent_feature_id', parentId || null);

    const newFeatureName = 'New Feature';
    let uniqueName = newFeatureName;
    let counter = 1;

    while (existingFeatures?.some(f => f.name === uniqueName)) {
      uniqueName = `${newFeatureName} ${counter}`;
      counter++;
    }

    const { error } = await supabase
      .from('features')
      .insert([{
        name: uniqueName,
        parent_feature_id: parentId,
        created_at: new Date().toISOString()
      }]);

    if (error) {
      console.error('Error creating feature:', error);
      return;
    }

    if (parentId) {
      setExpandedFeatures(prev => new Set(prev).add(parentId));
    }
    fetchFeatures();
  };

  const handleAddScenario = async (featureId: string) => {
    const { data: existingScenarios } = await supabase
      .from('scenarios')
      .select('name')
      .eq('feature_id', featureId);

    const newScenarioName = 'New Scenario';
    let uniqueName = newScenarioName;
    let counter = 1;

    while (existingScenarios?.some(s => s.name === uniqueName)) {
      uniqueName = `${newScenarioName} ${counter}`;
      counter++;
    }

    const { error } = await supabase
      .from('scenarios')
      .insert([{
        name: uniqueName,
        feature_id: featureId,
        created_at: new Date().toISOString()
      }]);

    if (error) {
      console.error('Error creating scenario:', error);
      return;
    }

    setExpandedFeatures(prev => new Set(prev).add(featureId));
    fetchFeatures();
  };

  const handleDeleteClick = (id: string, name: string, type: 'feature' | 'scenario') => {
    setDeleteModal({
      isOpen: true,
      id,
      name,
      type
    });
  };

  const handleDeleteConfirm = async () => {
    const { error } = await supabase
      .from(deleteModal.type === 'feature' ? 'features' : 'scenarios')
      .delete()
      .eq('id', deleteModal.id);

    if (error) {
      console.error(`Error deleting ${deleteModal.type}:`, error);
      return;
    }

    setDeleteModal({ isOpen: false, id: '', name: '', type: 'feature' });
    fetchFeatures();
  };

  const toggleFeature = (featureId: string) => {
    setExpandedFeatures(prev => {
      const next = new Set(prev);
      if (next.has(featureId)) {
        next.delete(featureId);
      } else {
        next.add(featureId);
      }
      return next;
    });
  };

  const startEditing = (id: string, name: string) => {
    setEditingId(id);
    setEditName(name);
  };

  const saveName = async (id: string, type: 'feature' | 'scenario') => {
    const { error } = await supabase
      .from(type === 'feature' ? 'features' : 'scenarios')
      .update({ name: editName })
      .eq('id', id);

    if (error) {
      console.error(`Error updating ${type}:`, error);
      return;
    }

    setEditingId(null);
    setEditName('');
    fetchFeatures();
  };

  const handleDragStart = (e: DragEvent<HTMLDivElement>, elementName: string) => {
    e.dataTransfer.setData('text/plain', elementName);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const target = e.currentTarget;
    target.classList.add('bg-blue-50');
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const target = e.currentTarget;
    target.classList.remove('bg-blue-50');
  };

  const handleDrop = async (e: DragEvent<HTMLDivElement>, scenarioId: string) => {
    e.preventDefault();
    const target = e.currentTarget;
    target.classList.remove('bg-blue-50');
    
    const elementName = e.dataTransfer.getData('text/plain');
    
    const { error } = await supabase
      .from('scenario_elements')
      .insert([{
        scenario_id: scenarioId,
        element_name: elementName,
        action_type: 'Click',
        action_value: '',
        created_at: new Date().toISOString()
      }]);

    if (error) {
      console.error('Error adding element to scenario:', error);
      return;
    }

    fetchFeatures();
  };

  const handleUpdateElementAction = async (elementId: string, actionType: string, actionValue?: string) => {
    const updates: { action_type: string; action_value?: string } = {
      action_type: actionType
    };

    if (actionValue !== undefined) {
      updates.action_value = actionValue;
    }

    const { error } = await supabase
      .from('scenario_elements')
      .update(updates)
      .eq('id', elementId);

    if (error) {
      console.error('Error updating element action:', error);
      return;
    }

    fetchFeatures();
  };

  const handleRemoveElement = async (elementId: string) => {
    const { error } = await supabase
      .from('scenario_elements')
      .delete()
      .eq('id', elementId);

    if (error) {
      console.error('Error removing element from scenario:', error);
      return;
    }

    fetchFeatures();
  };

  const handleTempValueChange = (elementId: string, value: string) => {
    setTempValues(prev => ({
      ...prev,
      [elementId]: value
    }));
  };

  const handleTempValueBlur = (element: ScenarioElement) => {
    const newValue = tempValues[element.id];
    if (newValue !== undefined && newValue !== element.action_value) {
      handleUpdateElementAction(element.id, element.action_type || 'Click', newValue);
    }
  };

  const handleDirectoryButtonClick = (featureId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedFeatureId(featureId);
    directoryInputRef.current?.click();
  };

  const handleDirectorySelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !selectedFeatureId) return;

    const fileArray = Array.from(files).sort((a, b) => a.webkitRelativePath.localeCompare(b.webkitRelativePath));
    
    setProcessing({
      total: fileArray.length,
      current: 0,
      step: 'folders',
      currentItem: 'Klasör yapısı oluşturuluyor...'
    });

    // Klasör yapısını oluştur
    const structure: { [key: string]: any } = {};
    
    for (const file of fileArray) {
      const path = file.webkitRelativePath.split('/');
      path.shift(); // İlk klasör adını kaldır
      
      let current = structure;
      for (let i = 0; i < path.length; i++) {
        const part = path[i];
        if (i === path.length - 1) {
          // Dosya seviyesi
          if (!current.files) current.files = [];
          if (!current.featureFiles) current.featureFiles = [];
          
          if (part.endsWith('.feature')) {
            current.featureFiles.push({
              name: part,
              content: await file.text()
            });
          } else {
            current.files.push(part);
          }
        } else {
          // Klasör seviyesi
          if (!current[part]) current[part] = {};
          current = current[part];
        }
      }

      setProcessing(prev => prev ? {
        ...prev,
        current: prev.current + 1
      } : null);
    }

    // Feature'ları ve senaryoları toplu ekle
    const featuresToAdd: any[] = [];
    const scenariosToAdd: any[] = [];
    
    const extractScenariosFromFeature = (content: string): string[] => {
      return content.split('\n')
        .map(line => line.trim())
        .filter(line => line.startsWith('Scenario:'))
        .map(line => line.replace('Scenario:', '').trim());
    };
    
    const processStructure = (structure: any, parentId: string | null = null) => {
      // Önce klasörleri işle
      for (const [name, content] of Object.entries(structure)) {
        if (name === 'files' || name === 'featureFiles') continue;

        const featureId = crypto.randomUUID();
        featuresToAdd.push({
          id: featureId,
          name,
          parent_feature_id: parentId || selectedFeatureId,
          created_at: new Date().toISOString()
        });

        // Alt klasör ve dosyaları işle
        if (Object.keys(content).length > 0) {
          processStructure(content, featureId);
        }
      }

      // Normal dosyaları feature olarak ekle
      if (structure.files) {
        structure.files.forEach((fileName: string) => {
          const fileFeatureId = crypto.randomUUID();
          featuresToAdd.push({
            id: fileFeatureId,
            name: fileName,
            parent_feature_id: parentId || selectedFeatureId,
            created_at: new Date().toISOString()
          });
        });
      }

      // Feature dosyalarını işle
      if (structure.featureFiles) {
        structure.featureFiles.forEach((featureFile: { name: string; content: string }) => {
          // Feature dosyasını feature olarak ekle
          const fileFeatureId = crypto.randomUUID();
          featuresToAdd.push({
            id: fileFeatureId,
            name: featureFile.name,
            parent_feature_id: parentId || selectedFeatureId,
            created_at: new Date().toISOString()
          });

          // Feature dosyası içindeki senaryoları ekle
          const scenarios = extractScenariosFromFeature(featureFile.content);
          scenarios.forEach(scenarioName => {
            scenariosToAdd.push({
              name: scenarioName,
              feature_id: fileFeatureId,
              created_at: new Date().toISOString()
            });
          });
        });
      }
    };

    setProcessing(prev => ({
      total: 3,
      current: 1,
      step: 'files',
      currentItem: 'Feature\'lar oluşturuluyor...'
    }));

    processStructure(structure);

    // Toplu ekleme işlemleri
    const BATCH_SIZE = 100;
    
    // Features ekle
    for (let i = 0; i < featuresToAdd.length; i += BATCH_SIZE) {
      const batch = featuresToAdd.slice(i, i + BATCH_SIZE);
      await supabase.from('features').insert(batch);
    }

    setProcessing(prev => prev ? {
      ...prev,
      current: 2,
      step: 'scenarios',
      currentItem: 'Senaryolar oluşturuluyor...'
    } : null);

    // Scenarios ekle
    for (let i = 0; i < scenariosToAdd.length; i += BATCH_SIZE) {
      const batch = scenariosToAdd.slice(i, i + BATCH_SIZE);
      await supabase.from('scenarios').insert(batch);
    }

    setProcessing(prev => prev ? {
      ...prev,
      current: 3,
      currentItem: 'Tamamlandı'
    } : null);

    setTimeout(() => setProcessing(null), 1000);
    fetchFeatures();
  };

  const renderScenario = (scenario: Scenario, level: number) => (
    <div 
      key={scenario.id}
      className="group flex flex-col gap-1 px-4 py-2 hover:bg-gray-50 transition-colors"
      style={{ paddingLeft: (level + 1) * 24 + 16 }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={(e) => handleDrop(e, scenario.id)}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <BookOpen className="w-4 h-4 text-violet-500" />
          </div>

          {editingId === scenario.id ? (
            <div className="flex items-center gap-2 bg-white rounded-lg shadow-sm border px-2 py-1">
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-[180px] px-2 py-1 text-sm focus:outline-none text-gray-900 placeholder-gray-400 bg-transparent"
                placeholder="Senaryo adı"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && editName.trim()) saveName(scenario.id, 'scenario');
                  if (e.key === 'Escape') setEditingId(null);
                }}
                autoFocus
              />
              <button
                onClick={() => editName.trim() && saveName(scenario.id, 'scenario')}
                className="text-sm text-blue-600 hover:text-blue-700 px-2 py-1 rounded hover:bg-blue-50"
              >
                Kaydet
              </button>
              <button
                onClick={() => setEditingId(null)}
                className="text-sm text-gray-400 hover:text-gray-600 px-2 py-1 rounded hover:bg-gray-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <span className="text-sm text-gray-600">{scenario.name}</span>
          )}
        </div>

        {!editingId && (
          <div className="hidden group-hover:flex items-center gap-1">
            <button
              onClick={() => startEditing(scenario.id, scenario.name)}
              className="p-1.5 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-blue-50"
              title="Düzenle"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => handleDeleteClick(scenario.id, scenario.name, 'scenario')}
              className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50"
              title="Sil"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {scenario.elements && scenario.elements.length > 0 && (
        <div className="mt-2 pl-8 space-y-1">
          {scenario.elements.map(element => {
            const [pageName, elementName] = element.element_name.split('.');
            const needsValue = ['Send Keys', 'Wait Text', 'Click List Item', 'Check List Item'].includes(element.action_type || 'Click');

            if (needsValue && tempValues[element.id] === undefined) {
              handleTempValueChange(element.id, element.action_value || '');
            }

            return (
              <div key={element.id} className="flex items-center gap-2 text-xs text-gray-500">
                <div className="w-1.5 h-1.5 bg-purple-400 rounded-full"></div>
                <select
                  value={element.action_type || 'Click'}
                  onChange={(e) => handleUpdateElementAction(element.id, e.target.value)}
                  className="text-xs border rounded px-1 py-0.5 bg-white"
                  onClick={(e) => e.stopPropagation()}
                >
                  <option value="Click">Click</option>
                  <option value="Send Keys">Send Keys</option>
                  <option value="Clear">Clear</option>
                  <option value="Wait Text">Wait Text</option>
                  <option value="Should See">Should See</option>
                  <option value="Click List Item">Click List Item</option>
                  <option value="Check List Item">Check List Item</option>
                </select>
                <span>{`${pageName}, ${element.action_type || 'Click'}, ${elementName}`}</span>
                {needsValue && (
                  <input
                    type="text"
                    value={tempValues[element.id] || ''}
                    onChange={(e) => handleTempValueChange(element.id, e.target.value)}
                    onBlur={() => handleTempValueBlur(element)}
                    className="text-xs border rounded px-1 py-0.5 bg-white w-32"
                    placeholder="Değer girin"
                    onClick={(e) => e.stopPropagation()}
                  />
                )}
                <button
                  onClick={() => handleRemoveElement(element.id)}
                  className="p-0.5 text-gray-400 hover:text-red-600 rounded"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  const renderFeature = (feature: Feature, level: number = 0) => {
    const isExpanded = expandedFeatures.has(feature.id);
    const hasChildren = (feature.features?.length || 0) + (feature.scenarios?.length || 0) > 0;
    const paddingLeft = level * 24 + 16;

    const countSubItems = (f: Feature): { features: number; scenarios: number } => {
      let count = {
        features: f.features?.length || 0,
        scenarios: f.scenarios?.length || 0
      };

      f.features?.forEach(subFeature => {
        const subCount = countSubItems(subFeature);
        count.features += subCount.features;
        count.scenarios += subCount.scenarios;
      });

      return count;
    };

    const counts = countSubItems(feature);

    return (
      <div key={feature.id}>
        <div 
          className="group flex items-center gap-2 px-4 py-2 hover:bg-gray-50 cursor-pointer"
          style={{ paddingLeft }}
          onClick={() => toggleFeature(feature.id)}
        >
          <div className="flex items-center gap-2 flex-1">
            <div className="flex items-center gap-1.5">
              {hasChildren && (
                isExpanded ? (
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                )
              )}
              {isExpanded ? (
                <FolderOpen className="w-5 h-5 text-emerald-500" />
              ) : (
                <FileText className="w-5 h-5 text-emerald-500" />
              )}
            </div>

            {editingId === feature.id ? (
              <div className="flex items-center gap-2 flex-1 bg-white rounded-lg shadow-sm border px-2 py-1">
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="flex-1 px-2 py-1 text-sm focus:outline-none text-gray-900 placeholder-gray-400 bg-transparent"
                  placeholder="Feature adı"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && editName.trim()) saveName(feature.id, 'feature');
                    if (e.key === 'Escape') setEditingId(null);
                  }}
                  onClick={(e) => e.stopPropagation()}
                  autoFocus
                />
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    editName.trim() && saveName(feature.id, 'feature');
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
              <span className="text-sm font-medium text-gray-700">
                {feature.name}
                <span className="ml-2 text-xs text-gray-400">
                  ({counts.features} feature • {counts.scenarios} senaryo)
                </span>
              </span>
            )}
          </div>

          {!editingId && (
            <div className="hidden group-hover:flex items-center gap-1">
              <button
                onClick={(e) => handleDirectoryButtonClick(feature.id, e)}
                className="p-1.5 text-gray-400 hover:text-violet-600 rounded-lg hover:bg-violet-50"
                title="Add To Cucumber"
              >
                <FolderInput className="w-4 h-4" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleAddFeature(feature.id);
                }}
                className="p-1.5 text-gray-400 hover:text-green-600 rounded-lg hover:bg-green-50"
                title="Dosya Ekle"
              >
                <FileText className="w-4 h-4" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleAddScenario(feature.id);
                }}
                className="p-1.5 text-gray-400 hover:text-green-600 rounded-lg hover:bg-green-50"
                title="Senaryo Ekle"
              >
                <BookOpen className="w-4 h-4" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  startEditing(feature.id, feature.name);
                }}
                className="p-1.5 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-blue-50"
                title="Düzenle"
              >
                <Pencil className="w-4 h-4" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteClick(feature.id, feature.name, 'feature');
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
          <>
            {feature.features?.map(subFeature => renderFeature(subFeature, level + 1))}
            {feature.scenarios?.map(scenario => renderScenario(scenario, level))}
          </>
        )}
      </div>
    );
  };

  return (
    <>
      <div className="mt-6 border rounded-lg overflow-hidden">
        <div className="bg-gray-50 px-4 py-3 border-b">
          <div className="flex justify-between items-center">
            <h2 className="text-sm font-medium text-gray-700">Cucumber Gezgini</h2>
            {processing && (
              <div className="flex items-center gap-3 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
                  <span>{processing.currentItem}</span>
                </div>
                <div className="text-gray-400">
                  {processing.step === 'folders' ? `(${processing.current}/${processing.total})` : `(${processing.current}/3)`}
                </div>
              </div>
            )}
          </div>
        </div>
        <input
          type="file"
          ref={directoryInputRef}
          className="hidden"
          webkitdirectory=""
          directory=""
          onChange={handleDirectorySelect}
        />
        <div className="divide-y">
          {features.map(feature => renderFeature(feature))}
          {features.length === 0 && (
            <div className="px-4 py-8 text-center text-sm text-gray-500">
              Henüz hiç feature yok. Yeni bir feature oluşturmak için "Feature Ekle" butonuna tıklayın.
            </div>
          )}
          {!editingId && (
            <div className="p-4 bg-gray-50">
              <button
                onClick={() => handleAddFeature(null)}
                className="w-full px-4 py-2 text-sm text-gray-600 hover:text-gray-900 bg-white border rounded-lg hover:bg-gray-50 flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Feature Ekle
              </button>
            </div>
          )}
        </div>
      </div>

      <DeleteModal
        isOpen={deleteModal.isOpen}
        name={deleteModal.name}
        type={deleteModal.type}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteModal({ isOpen: false, id: '', name: '', type: 'feature' })}
      />
    </>
  );
}; 