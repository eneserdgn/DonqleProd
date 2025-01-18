"use client";

import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Search, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface Element {
  id: string;
  name: string;
  selector_type: string;
  selector_value: string;
  action_type: string;
  action_value: string | null;
}

export const ElementTable = () => {
  const [elements, setElements] = useState<Element[]>([]);
  const [newElement, setNewElement] = useState<Partial<Element>>({
    name: '',
    selector_type: '',
    selector_value: '',
    action_type: '',
    action_value: '',
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchElements();
  }, []);

  const fetchElements = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('elements')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching elements:', error);
      return;
    }

    setElements(data || []);
    setLoading(false);
  };

  const handleAddElement = async () => {
    if (!newElement.name || !newElement.selector_type || !newElement.selector_value || !newElement.action_type) {
      alert('Lütfen gerekli alanları doldurun');
      return;
    }

    const { error } = await supabase
      .from('elements')
      .insert([newElement]);

    if (error) {
      console.error('Error adding element:', error);
      return;
    }

    setNewElement({
      name: '',
      selector_type: '',
      selector_value: '',
      action_type: '',
      action_value: '',
    });

    fetchElements();
  };

  const handleDeleteElement = async (id: string) => {
    if (!confirm('Bu elementi silmek istediğinizden emin misiniz?')) return;

    const { error } = await supabase
      .from('elements')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting element:', error);
      return;
    }

    fetchElements();
  };

  const filteredElements = elements.filter(element =>
    element.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    element.selector_value.toLowerCase().includes(searchTerm.toLowerCase()) ||
    element.action_type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-4 w-4 text-gray-400" />
        </div>
        <input
          type="text"
          placeholder="Element ara..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="block w-full pl-10 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
        />
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead>
            <tr className="bg-gray-50">
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Element Adı</th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Selector Tipi</th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Selector Değeri</th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action Tipi</th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action Değeri</th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-10"></th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {/* Yeni Element Satırı */}
            <tr className="bg-blue-50/50">
              <td className="px-4 py-2">
                <input
                  type="text"
                  value={newElement.name || ''}
                  onChange={(e) => setNewElement({ ...newElement, name: e.target.value })}
                  placeholder="Element Adı"
                  className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                />
              </td>
              <td className="px-4 py-2">
                <select
                  value={newElement.selector_type || ''}
                  onChange={(e) => setNewElement({ ...newElement, selector_type: e.target.value })}
                  className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                >
                  <option value="">Seçiniz</option>
                  <option value="id">ID</option>
                  <option value="class">Class</option>
                  <option value="name">Name</option>
                  <option value="xpath">XPath</option>
                  <option value="css">CSS Selector</option>
                </select>
              </td>
              <td className="px-4 py-2">
                <input
                  type="text"
                  value={newElement.selector_value || ''}
                  onChange={(e) => setNewElement({ ...newElement, selector_value: e.target.value })}
                  placeholder="Selector Değeri"
                  className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                />
              </td>
              <td className="px-4 py-2">
                <select
                  value={newElement.action_type || ''}
                  onChange={(e) => setNewElement({ ...newElement, action_type: e.target.value })}
                  className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                >
                  <option value="">Seçiniz</option>
                  <option value="click">Click</option>
                  <option value="type">Type</option>
                  <option value="select">Select</option>
                  <option value="hover">Hover</option>
                  <option value="clear">Clear</option>
                </select>
              </td>
              <td className="px-4 py-2">
                <input
                  type="text"
                  value={newElement.action_value || ''}
                  onChange={(e) => setNewElement({ ...newElement, action_value: e.target.value })}
                  placeholder="Action Değeri"
                  className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                />
              </td>
              <td className="px-4 py-2">
                <button
                  onClick={handleAddElement}
                  className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md transition-all duration-200"
                  title="Element Ekle"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </td>
            </tr>

            {/* Element Listesi */}
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-500">
                  Yükleniyor...
                </td>
              </tr>
            ) : filteredElements.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center">
                  <div className="flex flex-col items-center justify-center text-gray-500">
                    <AlertCircle className="w-6 h-6 mb-2" />
                    <p className="text-sm">
                      {searchTerm ? 'Aramanızla eşleşen element bulunamadı.' : 'Henüz element eklenmemiş.'}
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              filteredElements.map((element) => (
                <tr key={element.id} className="hover:bg-gray-50 transition-colors duration-200">
                  <td className="px-4 py-3 text-sm text-gray-900 font-medium">{element.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    <span className="px-2 py-1 bg-gray-100 rounded-md text-gray-700">
                      {element.selector_type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{element.selector_value}</td>
                  <td className="px-4 py-3 text-sm">
                    <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded-md">
                      {element.action_type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{element.action_value}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleDeleteElement(element.id)}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-all duration-200"
                      title="Elementi Sil"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}; 