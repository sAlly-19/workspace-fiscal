import React, { useState, useEffect } from 'react';
import { toast } from '../Toast';
import type { AppSettings, Company, CertificateInfo, SefazEnvironment } from '@/core/buscador/domain/types';
import {
  SefazEnvironmentCard,
  NfseEnvironmentCard,
  StorageFolderCard,
  CompaniesListCard,
  SefazRulesCard,
} from './buscador';

interface BuscadorSettingsTabProps {
  isLight: boolean;
}

export function BuscadorSettingsTab({ isLight }: BuscadorSettingsTabProps) {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [activeCompany, setActiveCompany] = useState<Company | null>(null);
  const [activeCert, setActiveCert] = useState<CertificateInfo | null>(null);
  const [, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      if (typeof window !== 'undefined' && window.fiscalApi) {
        const [curSettings, allCompanies, active] = await Promise.all([
          window.fiscalApi.settings.get(),
          window.fiscalApi.companies.list(),
          window.fiscalApi.companies.getActive(),
        ]);
        setSettings(curSettings);
        setCompanies(allCompanies);
        setActiveCompany(active);
        if (active) {
          const cert = await window.fiscalApi.certificates.getForCompany(active.id);
          setActiveCert(cert);
        }
      }
    } catch (err: any) {
      console.warn('Falha ao carregar configurações do Buscador:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleUpdateEnv = async (newEnv: SefazEnvironment) => {
    if (!settings || settings.sefaz_environment === newEnv) return;
    setSaving(true);
    try {
      const updated = await window.fiscalApi?.settings.update({
        sefaz_environment: newEnv,
      });
      if (updated) {
        setSettings(updated);
        toast.success(
          'Ambiente SEFAZ atualizado',
          `Alterado para ${newEnv === 'production' ? 'Produção' : 'Homologação'}.`
        );
      }
    } catch (err: any) {
      toast.error('Erro ao atualizar ambiente', err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSelectFolder = async () => {
    try {
      const selected = await window.fiscalApi?.settings.selectFolder(
        'Pasta Padrão de Armazenamento de XMLs'
      );
      if (selected) {
        const updated = await window.fiscalApi?.settings.update({
          default_storage_path: selected,
        });
        if (updated) {
          setSettings(updated);
          toast.success('Pasta padrão atualizada', selected);
        }
      }
    } catch (err: any) {
      toast.error('Erro ao selecionar pasta', err.message);
    }
  };

  const handleUpdateNfseEnv = async (newEnv: 'homologation' | 'production') => {
    if (!settings || settings.nfse_environment === newEnv) return;
    setSaving(true);
    try {
      const updated = await window.fiscalApi?.settings.update({
        nfse_environment: newEnv,
      });
      if (updated) {
        setSettings(updated);
        toast.success(
          'Ambiente NFS-e Nacional atualizado',
          `Alterado para ${newEnv === 'production' ? 'Produção' : 'Produção Restrita (Testes)'}.`
        );
      }
    } catch (err: any) {
      toast.error('Erro ao atualizar ambiente NFS-e', err.message);
    } finally {
      setSaving(false);
    }
  };

  const env = settings?.sefaz_environment || 'homologation';
  const nfseEnv = settings?.nfse_environment || 'homologation';
  const defaultFolder = settings?.default_storage_path || '';

  return (
    <div className="space-y-6 select-none">
      <SefazEnvironmentCard
        env={env}
        saving={saving}
        onUpdateEnv={handleUpdateEnv}
        isLight={isLight}
      />

      <NfseEnvironmentCard
        nfseEnv={nfseEnv}
        saving={saving}
        onUpdateNfseEnv={handleUpdateNfseEnv}
        isLight={isLight}
      />

      <StorageFolderCard
        defaultFolder={defaultFolder}
        onSelectFolder={handleSelectFolder}
        isLight={isLight}
      />

      <CompaniesListCard
        companies={companies}
        activeCompany={activeCompany}
        activeCert={activeCert}
        isLight={isLight}
      />

      <SefazRulesCard isLight={isLight} />
    </div>
  );
}
