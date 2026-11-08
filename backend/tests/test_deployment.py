"""
Tests de Déploiement Production - QA-016
Pharma 360 - Tests pour vérifier le déploiement en production
"""

import os
import subprocess
from pathlib import Path

import pytest


class TestDeploymentConfiguration:
    """Tests pour vérifier la configuration de déploiement"""

    def test_production_env_file_exists(self):
        """Vérifier que le fichier .env.production existe"""
        # Utiliser un chemin relatif au projet, pas au fichier de test
        project_root = Path(__file__).resolve().parent.parent.parent
        env_file = project_root / ".env.production"
        assert env_file.exists(), f"Fichier .env.production manquant à {env_file}"

    def test_production_docker_compose_exists(self):
        """Vérifier que docker-compose.prod.yml existe"""
        project_root = Path(__file__).resolve().parent.parent.parent
        compose_file = project_root / "docker" / "docker-compose.prod.yml"
        assert (
            compose_file.exists()
        ), f"Fichier docker-compose.prod.yml manquant à {compose_file}"

    def test_nginx_prod_config_exists(self):
        """Vérifier que la configuration Nginx production existe"""
        project_root = Path(__file__).resolve().parent.parent.parent
        nginx_config = project_root / "docker" / "nginx" / "nginx.prod.conf"
        assert (
            nginx_config.exists()
        ), f"Fichier nginx.prod.conf manquant à {nginx_config}"

    def test_deploy_script_exists(self):
        """Vérifier que le script de déploiement existe"""
        project_root = Path(__file__).resolve().parent.parent.parent
        deploy_script = project_root / "scripts" / "deploy-prod.sh"
        assert (
            deploy_script.exists()
        ), f"Script deploy-prod.sh manquant à {deploy_script}"

    def test_deploy_script_is_executable(self):
        """Vérifier que le script de déploiement est exécutable"""
        project_root = Path(__file__).resolve().parent.parent.parent
        deploy_script = project_root / "scripts" / "deploy-prod.sh"
        assert os.access(
            deploy_script, os.X_OK
        ), f"Script deploy-prod.sh non exécutable à {deploy_script}"

    def test_deployment_documentation_exists(self):
        """Vérifier que la documentation de déploiement existe"""
        project_root = Path(__file__).resolve().parent.parent.parent
        doc_file = project_root / "docs" / "DEPLOYMENT.md"
        assert doc_file.exists(), f"Documentation DEPLOYMENT.md manquante à {doc_file}"

    def test_production_env_has_required_keys(self):
        """Vérifier que .env.production contient les clés requises"""
        project_root = Path(__file__).resolve().parent.parent.parent
        env_file = project_root / ".env.production"
        with open(env_file, "r") as f:
            content = f.read()

        required_keys = [
            "APP_ENV=production",
            "APP_DEBUG=false",
            "POSTGRES_DB=pharma360_prod",
            "POSTGRES_USER=pharma_admin",
            "POSTGRES_PASSWORD=",
            "JWT_SECRET=",
            "APP_SECRET_KEY=",
        ]

        for key in required_keys:
            assert key in content, f"Clé requise manquante: {key}"

    def test_docker_compose_prod_has_production_settings(self):
        """Vérifier que docker-compose.prod.yml a les paramètres de production"""
        project_root = Path(__file__).resolve().parent.parent.parent
        compose_file = project_root / "docker" / "docker-compose.prod.yml"
        with open(compose_file, "r") as f:
            content = f.read()

        # Vérifier les noms des services production
        assert "pharma360-db-prod" in content
        assert "pharma360-backend-prod" in content
        assert "pharma360-frontend-prod" in content
        assert "pharma360-ia-prod" in content
        assert "pharma360-nginx-prod" in content

        # Vérifier les optimisations
        assert "APP_ENV: ${APP_ENV:-production}" in content
        assert "APP_DEBUG: ${APP_DEBUG:-false}" in content


class TestDockerConfiguration:
    """Tests pour vérifier la configuration Docker"""

    def test_dockerfiles_exist(self):
        """Vérifier que tous les Dockerfiles existent"""
        project_root = Path(__file__).resolve().parent.parent.parent
        dockerfiles = [
            project_root / "docker" / "backend.Dockerfile",
            project_root / "docker" / "frontend.Dockerfile",
            project_root / "docker" / "ia.Dockerfile",
        ]

        for dockerfile in dockerfiles:
            assert dockerfile.exists(), f"Dockerfile manquant: {dockerfile}"

    def test_docker_networks_configured(self):
        """Vérifier que les réseaux Docker sont configurés"""
        project_root = Path(__file__).resolve().parent.parent.parent
        compose_file = project_root / "docker" / "docker-compose.prod.yml"
        with open(compose_file, "r") as f:
            content = f.read()

        assert "pharma360-prod-network" in content

    def test_docker_volumes_configured(self):
        """Vérifier que les volumes Docker sont configurés"""
        project_root = Path(__file__).resolve().parent.parent.parent
        compose_file = project_root / "docker" / "docker-compose.prod.yml"
        with open(compose_file, "r") as f:
            content = f.read()

        assert "pharma360-db-prod-data" in content


class TestNginxConfiguration:
    """Tests pour vérifier la configuration Nginx"""

    def test_nginx_prod_has_optimizations(self):
        """Vérifier que nginx.prod.conf a les optimisations"""
        project_root = Path(__file__).resolve().parent.parent.parent
        nginx_config = project_root / "docker" / "nginx" / "nginx.prod.conf"
        with open(nginx_config, "r") as f:
            content = f.read()

        # Vérifier les optimisations
        assert "gzip on" in content
        assert "proxy_cache" in content
        assert "limit_req" in content
        assert "limit_conn" in content
        assert "add_header" in content

    def test_nginx_prod_has_proxy_config(self):
        """Vérifier que nginx.prod.conf a la configuration proxy"""
        project_root = Path(__file__).resolve().parent.parent.parent
        nginx_config = project_root / "docker" / "nginx" / "nginx.prod.conf"
        with open(nginx_config, "r") as f:
            content = f.read()

        assert "proxy_pass http://pharma360-backend:8000" in content
        assert "proxy_pass http://pharma360-ia:8001" in content


class TestBackupConfiguration:
    """Tests pour vérifier la configuration des sauvegardes"""

    def test_backup_script_exists(self):
        """Vérifier que le script de sauvegarde existe"""
        project_root = Path(__file__).resolve().parent.parent.parent
        backup_script = project_root / "scripts" / "backup-db.sh"
        assert backup_script.exists(), f"Script backup-db.sh manquant à {backup_script}"

    def test_restore_script_exists(self):
        """Vérifier que le script de restauration existe"""
        project_root = Path(__file__).resolve().parent.parent.parent
        restore_script = project_root / "scripts" / "restore-db.sh"
        assert (
            restore_script.exists()
        ), f"Script restore-db.sh manquant à {restore_script}"

    def test_backup_script_is_executable(self):
        """Vérifier que le script de sauvegarde est exécutable"""
        project_root = Path(__file__).resolve().parent.parent.parent
        backup_script = project_root / "scripts" / "backup-db.sh"
        assert os.access(
            backup_script, os.X_OK
        ), f"Script backup-db.sh non exécutable à {backup_script}"

    def test_backup_script_has_production_config(self):
        """Vérifier que le script de sauvegarde a la configuration production"""
        project_root = Path(__file__).resolve().parent.parent.parent
        backup_script = project_root / "scripts" / "backup-db.sh"
        with open(backup_script, "r") as f:
            content = f.read()

        assert "BACKUP_DIR=" in content
        assert "MAX_BACKUPS=" in content
        assert "pg_dump" in content


class TestSecurityConfiguration:
    """Tests pour vérifier la configuration de sécurité"""

    def test_nginx_has_security_headers(self):
        """Vérifier que Nginx a les en-têtes de sécurité"""
        project_root = Path(__file__).resolve().parent.parent.parent
        nginx_config = project_root / "docker" / "nginx" / "nginx.prod.conf"
        with open(nginx_config, "r") as f:
            content = f.read()

        security_headers = [
            "X-Frame-Options",
            "X-Content-Type-Options",
            "X-XSS-Protection",
            "Strict-Transport-Security",
            "Content-Security-Policy",
        ]

        for header in security_headers:
            assert header in content, f"En-tête de sécurité manquant: {header}"

    def test_production_passwords_are_strong(self):
        """Vérifier que les mots de passe de production sont forts"""
        project_root = Path(__file__).resolve().parent.parent.parent
        env_file = project_root / ".env.production"
        with open(env_file, "r") as f:
            content = f.read()

        # Vérifier que les mots de passe ne sont pas les valeurs par défaut
        assert "changer_par_un_mot_de_passe" not in content
        assert "changer_par_une_cle" not in content

        # Vérifier que les mots de passe ont au moins 16 caractères
        import re

        password_pattern = r"(POSTGRES_PASSWORD|JWT_SECRET|APP_SECRET_KEY)=([^\s]+)"
        matches = re.findall(password_pattern, content)

        for _, password in matches:
            assert len(password) >= 16, f"Mot de passe trop court: {password}"


class TestDocumentation:
    """Tests pour vérifier la documentation"""

    def test_deployment_doc_has_required_sections(self):
        """Vérifier que la documentation de déploiement a les sections requises"""
        project_root = Path(__file__).resolve().parent.parent.parent
        doc_file = project_root / "docs" / "DEPLOYMENT.md"
        with open(doc_file, "r") as f:
            content = f.read()

        required_sections = [
            "# Pharma 360 - Guide de Déploiement Production",
            "Prérequis",
            "Préparation de l'Environnement",
            "Configuration",
            "Déploiement",
            "Vérifications Post-Déploiement",
            "Sauvegardes et Restauration",
            "Surveillance et Maintenance",
            "Résolution des Problèmes",
        ]

        for section in required_sections:
            assert section in content, f"Section manquante: {section}"

    def test_deployment_doc_has_commands(self):
        """Vérifier que la documentation a les commandes utiles"""
        project_root = Path(__file__).resolve().parent.parent.parent
        doc_file = project_root / "docs" / "DEPLOYMENT.md"
        with open(doc_file, "r") as f:
            content = f.read()

        # Vérifier quelques commandes
        assert "docker ps" in content
        assert "docker-compose" in content
        assert "alembic upgrade head" in content


class TestDeploymentSmoke:
    """Tests de smoke pour le déploiement"""

    def test_docker_compose_prod_is_valid_yaml(self):
        """Vérifier que docker-compose.prod.yml est un YAML valide"""
        project_root = Path(__file__).resolve().parent.parent.parent
        compose_file = project_root / "docker" / "docker-compose.prod.yml"

        # Essayer de parser le YAML
        try:
            import yaml

            with open(compose_file, "r") as f:
                yaml.safe_load(f)
        except ImportError:
            # Si PyYAML n'est pas installé, sauter le test
            pytest.skip("PyYAML non installé, saut du test")
        except yaml.YAMLError as e:
            pytest.fail(f"YAML invalide: {e}")

    def test_deploy_script_has_shebang(self):
        """Vérifier que le script de déploiement a un shebang"""
        project_root = Path(__file__).resolve().parent.parent.parent
        deploy_script = project_root / "scripts" / "deploy-prod.sh"
        with open(deploy_script, "r") as f:
            first_line = f.readline()

        assert first_line.strip() == "#!/bin/bash", "Shebang manquant"

    def test_backup_script_has_shebang(self):
        """Vérifier que le script de sauvegarde a un shebang"""
        project_root = Path(__file__).resolve().parent.parent.parent
        backup_script = project_root / "scripts" / "backup-db.sh"
        with open(backup_script, "r") as f:
            first_line = f.readline()

        assert first_line.strip() == "#!/bin/bash", "Shebang manquant"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
