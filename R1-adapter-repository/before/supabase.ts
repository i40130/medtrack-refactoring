// src/lib/supabase.ts — Extracto del PoC original
// God Object: 854 líneas, todos los dominios mezclados en un único fichero

import { supabase } from '@/integrations/supabase/client';

export const supabaseUtils = {

  // --- Autenticación ---
  async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email, password
    });
    if (error) throw error;
    return data;
  },

  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  async getCurrentUser() {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  },

  // --- Medicación (mismo objeto, mismo fichero) ---
  async getAllMedications(userId: string) {
    const { data, error } = await supabase
      .from('medications')
      .select('*')
      .eq('patient_id', userId);
    if (error) throw error;
    return data;
  },

  async addMedication(medication: any) {
    const { data, error } = await supabase
      .from('medications')
      .insert(medication)
      .select();
    if (error) throw error;
    return data;
  },

  async updateMedication(id: string, updates: any) {
    const { data, error } = await supabase
      .from('medications')
      .update(updates)
      .eq('id', id)
      .select();
    if (error) throw error;
    return data;
  },

  async deleteMedication(id: string) {
    const { error } = await supabase
      .from('medications')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  // --- Dosis (mismo objeto, mismo fichero) ---
  async getDosesForPeriod(userId: string, startDate: string, endDate: string) {
    const { data, error } = await supabase
      .from('dose_events')
      .select('*')
      .eq('patient_id', userId)
      .gte('due_at', startDate)
      .lte('due_at', endDate);
    if (error) throw error;
    return data;
  },

  async getTodaysDoses(userId: string) {
    const today = new Date().toISOString().split('T')[0];
    return this.getDosesForPeriod(userId, today + 'T00:00:00', today + 'T23:59:59');
  },

  async addDoseEvent(event: any) {
    const { data, error } = await supabase
      .from('dose_events')
      .insert(event)
      .select();
    if (error) throw error;
    return data;
  },

  async markDoseAsTaken(doseId: string) {
    const { data, error } = await supabase
      .from('dose_events')
      .update({ status: 'taken', taken_at: new Date().toISOString() })
      .eq('id', doseId)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // --- Constantes vitales: Presión arterial (mismo objeto) ---
  async getBloodPressureReadings(userId: string) {
    const { data, error } = await supabase
      .from('blood_pressure_readings')
      .select('*')
      .eq('patient_id', userId)
      .order('measured_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  async addBloodPressureReading(reading: any) {
    const { data, error } = await supabase
      .from('blood_pressure_readings')
      .insert(reading)
      .select();
    if (error) throw error;
    return data;
  },

  // --- Constantes vitales: Peso (mismo objeto) ---
  async getWeightRecords(userId: string) {
    const { data, error } = await supabase
      .from('weight_records')
      .select('*')
      .eq('patient_id', userId)
      .order('measured_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  async addWeightRecord(record: any) {
    const { data, error } = await supabase
      .from('weight_records')
      .insert(record)
      .select();
    if (error) throw error;
    return data;
  },

  // --- Informes clínicos (mismo objeto) ---
  async getCurrentReport(patientId: string) {
    const { data, error } = await supabase
      .from('medical_reports')
      .select('*')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async saveReport(report: any) {
    const { data, error } = await supabase
      .from('medical_reports')
      .upsert(report)
      .select();
    if (error) throw error;
    return data;
  },

  // --- Sincronización (stub) ---
  async syncLocalData() {
    console.log("Syncing local data with Supabase...");
    // No implementado en el PoC
  }
};
