"""In-memory demo seed — replaced by Git + Docker integrations later."""

from __future__ import annotations

from typing import Dict, List

from app.models.schemas import BranchOut, ModuleOut, RepoOut

REPOS: List[RepoOut] = [
    RepoOut(
        id="repo-nimbus-cart",
        project_key="NIMBUS",
        slug="nimbus-cart",
        name="Nimbus Cart",
        description="Checkout platform microservices with Dockerfiles per module.",
        default_branch="development",
    )
]

BRANCHES: Dict[str, List[BranchOut]] = {
    "repo-nimbus-cart": [
        BranchOut(
            name="development",
            short_sha="e7c41a9",
            commit_message="Inventory stock sync retry",
            updated_at="2026-09-21T09:15:00+03:00",
            dockerfile_count=10,
        ),
        BranchOut(
            name="release/2.3.1",
            short_sha="91bf02d",
            commit_message="Release 2.3.1 tags",
            updated_at="2026-09-12T14:02:00+03:00",
            dockerfile_count=10,
        ),
        BranchOut(
            name="feature/promo-codes",
            short_sha="c4d88e1",
            commit_message="Promo code validation API",
            updated_at="2026-09-10T11:40:00+03:00",
            dockerfile_count=9,
        ),
    ]
}

_DEV_MODULES: List[ModuleOut] = [
    ModuleOut(
        id="mod-catalog",
        name="Catalog",
        path="services/catalog",
        dockerfile="Dockerfile",
        base_image="eclipse-temurin:17-jre-alpine",
        expose="8080",
        image_name="nimbus-catalog",
        status="ready",
        last_image_tag="nimbus-catalog:2.3.1-e7c41a9",
        last_artifact="catalog-2.3.1-e7c41a9.tar.gz",
        last_job_id="job-201",
    ),
    ModuleOut(
        id="mod-cart",
        name="Cart",
        path="services/cart",
        dockerfile="Dockerfile",
        base_image="eclipse-temurin:17-jre-alpine",
        expose="8081",
        image_name="nimbus-cart",
        status="ready",
        last_image_tag="nimbus-cart:2.3.1-e7c41a9",
        last_artifact="cart-2.3.1-e7c41a9.tar.gz",
        last_job_id="job-202",
    ),
    ModuleOut(
        id="mod-checkout",
        name="Checkout",
        path="services/checkout",
        dockerfile="Dockerfile",
        base_image="eclipse-temurin:17-jre-alpine",
        expose="8082",
        image_name="nimbus-checkout",
        status="building",
        last_job_id="job-203",
    ),
    ModuleOut(
        id="mod-payment",
        name="Payment",
        path="services/payment",
        dockerfile="Dockerfile",
        base_image="eclipse-temurin:17-jre-alpine",
        expose="8083",
        image_name="nimbus-payment",
        status="idle",
        note="PCI sandbox credentials required",
    ),
    ModuleOut(
        id="mod-inventory",
        name="Inventory",
        path="services/inventory",
        dockerfile="Dockerfile",
        base_image="eclipse-temurin:17-jre-alpine",
        expose="8084",
        image_name="nimbus-inventory",
        status="idle",
    ),
    ModuleOut(
        id="mod-notify",
        name="Notification",
        path="services/notification",
        dockerfile="Dockerfile",
        base_image="node:20-alpine",
        expose="8090",
        image_name="nimbus-notification",
        status="idle",
    ),
    ModuleOut(
        id="mod-identity",
        name="Identity",
        path="services/identity",
        dockerfile="Dockerfile",
        base_image="eclipse-temurin:17-jre-alpine",
        expose="8085",
        image_name="nimbus-identity",
        status="pushed",
        last_image_tag="nimbus-identity:2.3.1-e7c41a9",
        last_artifact="identity-2.3.1-e7c41a9.tar.gz",
        last_job_id="job-204",
    ),
    ModuleOut(
        id="mod-search",
        name="Search",
        path="services/search",
        dockerfile="Dockerfile",
        base_image="eclipse-temurin:17-jre-alpine",
        expose="8086",
        image_name="nimbus-search",
        status="idle",
    ),
    ModuleOut(
        id="mod-gateway",
        name="API Gateway",
        path="services/gateway",
        dockerfile="Dockerfile",
        base_image="nginx:1.27-alpine",
        expose="8088",
        image_name="nimbus-gateway",
        status="idle",
        note="Edge reverse proxy",
    ),
    ModuleOut(
        id="mod-storefront",
        name="Storefront",
        path="apps/storefront",
        dockerfile="Dockerfile",
        base_image="nginx:1.27-alpine",
        expose="443",
        image_name="nimbus-storefront",
        status="failed",
        last_job_id="job-205",
        note="Requires dist/ before build",
    ),
]

MODULES: Dict[str, List[ModuleOut]] = {
    "repo-nimbus-cart:development": list(_DEV_MODULES),
    "repo-nimbus-cart:release/2.3.1": [
        m.model_copy(
            update={
                "status": "ready",
                "last_image_tag": "{0}:2.3.1-91bf02d".format(m.image_name),
                "last_artifact": "{0}-2.3.1-91bf02d.tar.gz".format(m.id),
            }
        )
        for m in _DEV_MODULES
    ],
    "repo-nimbus-cart:feature/promo-codes": [
        m.model_copy(
            update={
                "status": "idle",
                "last_image_tag": None,
                "last_artifact": None,
                "last_job_id": None,
            }
        )
        for m in _DEV_MODULES
        if m.id != "mod-gateway"
    ],
}

# job_id -> JobOut.model_dump()
JOBS: Dict[str, dict] = {}
