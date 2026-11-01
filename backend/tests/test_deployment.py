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
        env_file = Path("./backend/tests/../../.env.production")
        assert env_file.exists(), "Fichier .env.production manquant"

    def test_production_docker_compose_exists(self):
        """Vérifier que docker-compose.prod.yml existe"""
        compose_file = Path("./docker/docker-compose.prod.yml")
        assert compose_file.exists(), "Fichier docker-compose.prod.yml manquant"

    def test_nginx_prod_config_exists(self):
        """Vérifier que la configuration Nginx production existe"""
        nginx_config = Path("./docker/nginx/nginx.prod.conf")
        assert nginx_config.exists(), "Fichier nginx.prod.conf manquant"

    def test_deploy_script_exists(self):
        """Vérifier que le script de déploiement existe"""
        deploy_script = Path("./scripts/deploy-prod.sh")
        assert deploy_script.exists(), "Script deploy-prod.sh manquant"

    def test_deploy_script_is_executable(self):
        """Vérifier que le script de déploiement est exécutable"""
        deploy_script = Path("./scripts/deploy-prod.sh")
        assert os.access(deploy_script, os.X_OK), "Script deploy-prod.sh non exécutable"

    def test_deployment_documentation_exists(self):
        """Vérifier que la documentation de déploiement existe"""
        doc_file = Path("./docs/DEPLOYMENT.md")
        assert doc_file.exists(), "Documentation DEPLOYMENT.md manquante"

    def test_production_env_has_required_keys(self):
        """Vérifier que .env.production contient les clés requises"""
        env_file = Path("./backend/tests/../../.env.production")
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
        compose_file = Path("./docker/docker-compose.prod.yml")
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
        dockerfiles = [
            Path("./docker/backend.Dockerfile"),
            Path("./docker/frontend.Dockerfile"),
            Path("./docker/ia.Dockerfile"),
        ]

        for dockerfile in dockerfiles:
            assert dockerfile.exists(), f"Dockerfile manquant: {dockerfile}"

    def test_docker_networks_configured(self):
        """Vérifier que les réseaux Docker sont configurés"""
        compose_file = Path("./docker/docker-compose.prod.yml")
        with open(compose_file, "r") as f:
            content = f.read()

        assert "pharma360-prod-network" in content

    def test_docker_volumes_configured(self):
        """Vérifier que les volumes Docker sont configurés"""
        compose_file = Path("./docker/docker-compose.prod.yml")
        with open(compose_file, "r") as f:
            content = f.read()

        assert "pharma360-db-prod-data" in content


class TestNginxConfiguration:
    """Tests pour vérifier la configuration Nginx"""

    def test_nginx_prod_has_optimizations(self):
        """Vérifier que nginx.prod.conf a les optimisations"""
        nginx_config = Path("./docker/nginx/nginx.prod.conf")
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
        nginx_config = Path("./docker/nginx/nginx.prod.conf")
        with open(nginx_config, "r") as f:
            content = f.read()

        assert "proxy_pass http://pharma360-backend:8000" in content
        assert "proxy_pass http://pharma360-ia:8001" in content


class TestBackupConfiguration:
    """Tests pour vérifier la configuration des sauvegardes"""

    def test_backup_script_exists(self):
        """Vérifier que le script de sauvegarde existe"""
        backup_script = Path("./scripts/backup-db.sh")
        assert backup_script.exists(), "Script backup-db.sh manquant"

    def test_restore_script_exists(self):
        """Vérifier que le script de restauration existe"""
        restore_script = Path("./scripts/restore-db.sh")
        assert restore_script.exists(), "Script restore-db.sh manquant"

    def test_backup_script_is_executable(self):
        """Vérifier que le script de sauvegarde est exécutable"""
        backup_script = Path("./scripts/backup-db.sh")
        assert os.access(backup_script, os.X_OK), "Script backup-db.sh non exécutable"

    def test_backup_script_has_production_config(self):
        """Vérifier que le script de sauvegarde a la configuration production"""
        backup_script = Path("./scripts/backup-db.sh")
        with open(backup_script, "r") as f:
            content = f.read()

        assert "BACKUP_DIR=" in content
        assert "MAX_BACKUPS=" in content
        assert "pg_dump" in content


class TestSecurityConfiguration:
    """Tests pour vérifier la configuration de sécurité"""

    def test_nginx_has_security_headers(self):
        """Vérifier que Nginx a les en-têtes de sécurité"""
        nginx_config = Path("./docker/nginx/nginx.prod.conf")
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
        env_file = Path("./backend/tests/../../.env.production")
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
        doc_file = Path("./docs/DEPLOYMENT.md")
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
        doc_file = Path("./docs/DEPLOYMENT.md")
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
        compose_file = Path("./docker/docker-compose.prod.yml")

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
        deploy_script = Path("./scripts/deploy-prod.sh")
        with open(deploy_script, "r") as f:
            first_line = f.readline()

        assert first_line.strip() == "#!/bin/bash", "Shebang manquant"

    def test_backup_script_has_shebang(self):
        """Vérifier que le script de sauvegarde a un shebang"""
        backup_script = Path("./scripts/backup-db.sh")
        with open(backup_script, "r") as f:
            first_line = f.readline()

        assert first_line.strip() == "#!/bin/bash", "Shebang manquant"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
