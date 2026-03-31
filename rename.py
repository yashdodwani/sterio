import os
import re
files_list = [
    "/home/voyager4/projects/coma-polkadot/apps/frontend/package.json",
    "/home/voyager4/projects/coma-polkadot/apps/frontend/next.config.ts",
    "/home/voyager4/projects/coma-polkadot/apps/frontend/app/page.tsx",
    "/home/voyager4/projects/coma-polkadot/apps/frontend/src/types/api.d.ts",
    "/home/voyager4/projects/coma-polkadot/apps/frontend/components/landing/HowItWorks.tsx",
    "/home/voyager4/projects/coma-polkadot/apps/frontend/components/landing/HeroChatDemo.tsx",
    "/home/voyager4/projects/coma-polkadot/apps/scraping/package.json",
    "/home/voyager4/projects/coma-polkadot/apps/scraping/src/common/utils/blockchain.utils.ts",
    "/home/voyager4/projects/coma-polkadot/apps/scraping/src/paywall/x402-payment.guard.ts",
    "/home/voyager4/projects/coma-polkadot/apps/scraping/src/database/entities/payment.entity.ts",
    "/home/voyager4/projects/coma-polkadot/apps/scraping/src/order/order.service.ts",
    "/home/voyager4/projects/coma-polkadot/apps/scraping/src/config/app-config.service.ts",
    "/home/voyager4/projects/coma-polkadot/apps/scraping/src/payment/dto/verify-transaction.dto.ts",
    "/home/voyager4/projects/coma-polkadot/apps/scraping/src/payment/payment.service.ts",
    "/home/voyager4/projects/coma-polkadot/apps/scraping/src/payment/transaction.service.ts",
    "/home/voyager4/projects/coma-polkadot/apps/scraping/src/payment/payment.controller.ts",
    "/home/voyager4/projects/coma-polkadot/apps/backend/package.json",
    "/home/voyager4/projects/coma-polkadot/apps/backend/src/db/schema/orders.ts",
    "/home/voyager4/projects/coma-polkadot/apps/backend/src/lib/logger.ts",
    "/home/voyager4/projects/coma-polkadot/apps/backend/src/lib/env.ts",
    "/home/voyager4/projects/coma-polkadot/apps/backend/src/lib/openapi-schemas.ts",
    "/home/voyager4/projects/coma-polkadot/apps/backend/src/lib/errors.ts",
    "/home/voyager4/projects/coma-polkadot/apps/backend/src/services/deposit-service-live.ts",
    "/home/voyager4/projects/coma-polkadot/README.md"
]
for filepath in files_list:
    try:
        with open(filepath, 'r') as f:
            content = f.read()
        # coma-polkadot -> sterio-mantle
        content = content.replace("coma-polkadot", "sterio-mantle")
        # coma_polkadot -> sterio_mantle
        content = content.replace("coma_polkadot", "sterio_mantle")
        # COMA -> Sterio
        content = content.replace("COMA", "Sterio")
        # Coma -> Sterio
        content = content.replace("Coma", "Sterio")
        # coma -> sterio
        content = content.replace("coma", "sterio")
        # Since 'polkadot' was not explicitly asked to be generally replaced to 'mantle' except in package names, but checking prompt... 
        # Wait, the prompt mentions 'polkadot' to 'mantle' in the grep but the replacement rules strictly say:
        # - "COMA" -> "Sterio"
        # - "coma" -> "sterio"
        # - "Coma" -> "Sterio"
        # - "coma-polkadot" -> "sterio-mantle"
        # - "coma_polkadot" -> "sterio_mantle"
        with open(filepath, 'w') as f:
            f.write(content)
        print(f"Updated {filepath}")
    except Exception as e:
        print(f"Error {filepath}: {e}")
