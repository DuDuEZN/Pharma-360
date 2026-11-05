# 🚀 Configuration des Git Hooks - Pharma 360

## 📋 À propos

Ce projet utilise des **Git Hooks** pour automatiser le formatage du code Python avant chaque commit. Cela garantit que tout le code est correctement formaté avec **black** et **isort** avant d'être validé.

## 🎯 Solution Implémentée

Nous avons mis en place une **solution combinée** pour résoudre définitivement les problèmes de formatage :

### 1️⃣ **Pre-commit Hook** (Solution locale)
Un hook qui s'exécute **avant chaque commit** pour formater automatiquement le code.

### 2️⃣ **CI/CD Auto-format** (Filet de sécurité)
Le workflow CI/CD applique aussi le formatage automatiquement si le code n'a pas été formaté localement.

### 3️⃣ **Script d'installation** (Facilité d'utilisation)
Un script simple pour installer les hooks sur n'importe quelle machine.

## 🛠️ Installation

### Méthode 1 : Exécuter le script d'installation (Recommandé)

```bash
# Depuis la racine du projet
chmod +x scripts/setup-git-hooks.sh
./scripts/setup-git-hooks.sh
```

### Méthode 2 : Installation manuelle

```bash
# Créer le répertoire des hooks
mkdir -p .git/hooks

# Copier le pre-commit hook
cp .github/hooks/pre-commit .git/hooks/pre-commit

# Rendre le hook exécutable
chmod +x .git/hooks/pre-commit
```

## ⚙️ Prérequis

Avant d'utiliser les hooks, assurez-vous d'avoir :

1. **Python 3.11+** installé
2. **black** et **isort** installés :
   ```bash
   pip install black isort
   ```

## 🔄 Comment ça fonctionne

1. **Avant chaque commit**, le hook `pre-commit` s'exécute
2. Il formate tous les fichiers Python dans `backend/` et `ia/` avec :
   - `black` : Formatage du code
   - `isort` : Tri des imports
3. Les fichiers modifiés sont automatiquement ajoutés au staging
4. Le commit peut ensuite se faire normalement

## ✅ Vérification

Pour tester que le hook fonctionne :

```bash
# Modifier un fichier Python
nano backend/main.py

# Ajouter le fichier
 git add backend/main.py

# Essayer de commiter
 git commit -m "test"

# Vous devriez voir :
# 🔧 Running pre-commit hooks for Pharma-360...
# 📁 Formatting backend/ with black...
# 📁 Sorting imports in backend/ with isort...
# 📝 Adding formatted files to staging...
# ✅ Pre-commit hooks completed successfully!
```

## 🚫 Désactivation temporaire

Si vous devez faire un commit sans formatage (non recommandé) :

```bash
# Désactiver le hook temporairement
git commit --no-verify -m "message"

# Ou supprimer le hook
rm .git/hooks/pre-commit
```

## 💡 Bonnes pratiques

1. **Installez les hooks** dès que vous clonez le projet
2. **Vérifiez les prérequis** (Python, black, isort)
3. **Ne désactivez pas les hooks** sauf en cas d'urgence
4. **Faites confiance au hook** - il améliore la qualité du code

## 📝 Notes

- Le hook est **automatique** et ne nécessite aucune action de votre part
- Le formatage est **non destructif** - il ne change que le style, pas la logique
- Le CI/CD appliquera aussi le formatage, mais le hook local est plus rapide

## 🎉 Résultat

Avec cette solution combinée :
- ✅ **Plus d'échecs de CI/CD** dus au formatage
- ✅ **Code toujours formaté** avant commit
- ✅ **Filet de sécurité** dans le CI au cas où
- ✅ **Installation simple** pour tous les développeurs
