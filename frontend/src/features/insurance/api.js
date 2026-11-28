import api from '@/lib/api'
const BASE = '/insurance'
export const insuranceApi = {
  listStructures(params) { return api.get(`${BASE}/structures`, { params }) },
  createStructure(payload) { return api.post(`${BASE}/structures`, payload) },
  updateStructure(id, payload) { return api.put(`${BASE}/structures/${id}`, payload) },
  deleteStructure(id) { return api.delete(`${BASE}/structures/${id}`) },
  listClients(params) { return api.get(`${BASE}/clients`, { params }) },
  createClient(payload) { return api.post(`${BASE}/clients`, payload) },
  updateClient(id, payload) { return api.put(`${BASE}/clients/${id}`, payload) },
  deleteClient(id) { return api.delete(`${BASE}/clients/${id}`) },
}
export default insuranceApi
