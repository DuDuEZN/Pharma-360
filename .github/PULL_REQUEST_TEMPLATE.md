# 📝 **Pull Request Template - Pharmacie 360°**

**⚠️ NE PAS MODIFIER CE FICHIER - Il est utilisé automatiquement par GitHub**

---

## 🎯 **Informations Générales**

| Champ | Valeur | Obligatoire |
|-------|--------|-------------|
| **ID Tâche** | `ex: ARCH-001` | ✅ |
| **Type** | `[ ] Feature` `[ ] Bugfix` `[ ] Documentation` `[ ] Refactor` `[ ] Hotfix` | ✅ |
| **Phase** | `[ ] Phase 1` `[ ] Phase 2` `[ ] Phase 3` `[ ] Phase 4` | ✅ |
| **Priorité** | `⭐` `⭐⭐` `⭐⭐⭐` `⭐⭐⭐⭐` `⭐⭐⭐⭐⭐` | ✅ |

---

## 📋 **Description**

### **Quoi ?** (Qu'est-ce qui a été changé ?)
- [ ] Description claire et concise des modifications
- [ ] Lien vers la tâche dans le projet (ex: ARCH-001)
- [ ] Capture d'écran si modification UI

### **Pourquoi ?** (Pourquoi ces changements ?)
- [ ] Explication du besoin ou du problème résolu
- [ ] Lien vers les spécifications (ex: docs/ARCH-001_SPECIFICATIONS.md)

### **Comment ?** (Comment les changements ont été implémentés ?)
- [ ] Description technique des modifications
- [ ] Algorithmes ou logique métier expliqués
- [ ] Décisions d'architecture justifiées

---

## 🔍 **Détails Techniques**

### **Fichiers Modifiés**
```
backend/
├── models/
│   └── product.py  # Ajout du champ code-barres
frontend/
├── components/
│   └── BarcodeInput.jsx  # Composant de scan
```

### **Dépendances**
- [ ] Liste des nouvelles dépendances ajoutées
- [ ] Versions des packages utilisés
- [ ] Justification des choix

### **Tests**
- [ ] Tests unitaires ajoutés/modifiés
- [ ] Tests d'intégration
- [ ] Résultats des tests (couverture de code)

---

## ✅ **Checklist de Validation**

### **Code**
- [ ] Code compilé et fonctionnel
- [ ] Pas de secrets ou mots de passe en dur
- [ ] Respect des conventions du projet (PEP 8, etc.)
- [ ] Typage strict (Pydantic, TypeScript)
- [ ] Gestion des erreurs implémentée

### **Documentation**
- [ ] Documentation mise à jour (si nécessaire)
- [ ] Commentaires dans le code (si nécessaire)
- [ ] README.md mis à jour (si nécessaire)

### **Tests**
- [ ] Tests unitaires passés
- [ ] Tests d'intégration passés
- [ ] Tests manuels effectués

### **Sécurité**
- [ ] Pas de vulnérabilités introduites
- [ ] RBAC respecté
- [ ] Données sensibles protégées

---

## 🔗 **Liens et Références**

- **Tâche** : [Lien vers la tâche dans GitHub Projects]
- **Spécifications** : [Lien vers le document de spécifications]
- **Issues liées** : Closes #
- **Autres PRs dépendantes** : [Lien vers les PRs dépendantes]

---

## 📊 **Métriques**

| Métrique | Valeur | Cible |
|----------|--------|-------|
| Couverture de code | X% | > 90% |
| Taille de l'image Docker | X MB | < 500 MB |
| Temps de build | X s | < 5 min |

---

## 👥 **Revue**

### **Revueurs Requise**
- [ ] @agent-superviseur-de-projet (Superviseur)
- [ ] @agent-d-veloppeur-backend-lead (Backend Lead)
- [ ] @agent-d-veloppeur-frontend (Frontend)
- [ ] @agent-data-scientist-expert-ia (IA)
- [ ] @agent-qa-quality-assurance-devops-engineer (QA/DevOps)

### **Approbations**
- [ ] Architecture validée
- [ ] Code revu
- [ ] Tests validés
- [ ] Sécurité vérifiée

---

## 🚀 **Déploiement**

- [ ] Prêt pour le merge dans `main`
- [ ] Nécessite un déploiement manuel ? `[ ] Oui` `[ ] Non`
- [ ] Instructions de déploiement :

---

## 💬 **Commentaires**

*(Laisser vide ou ajouter des commentaires pour les revueurs)*

---

**✅ PR prête pour la revue quand toutes les cases sont cochées**
