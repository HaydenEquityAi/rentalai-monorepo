"""
Seed Database with Sample Data
Run with: python scripts/seed_data.py
"""

import asyncio
import sys
from pathlib import Path
from datetime import datetime, timedelta, date
from decimal import Decimal

# Add parent directory to path
sys.path.append(str(Path(__file__).parent.parent))

from sqlalchemy import select
from app.core.database import AsyncSessionLocal, engine
from app.core.security import hash_password
from app.models import (
    Base, Organization, User, Owner, Property, Unit,
    Lead, Lease, Payment, MaintenanceRequest, Document, AIJob,
    PropertyType, UnitStatus, LeadStatus, LeadSource, ApplicationStatus,
    LeaseStatus, WorkOrderStatus, WorkOrderPriority, WorkOrderCategory,
    PaymentStatus, PaymentMethod, UserRole, SubscriptionTier,
    MaintenanceStatus, MaintenancePriority, AIJobStatus
)


async def create_tables():
    """Create all database tables"""
    print("🗄️  Creating database tables...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    print("✅ Tables created successfully")


async def seed_organizations():
    """Seed organizations"""
    print("\n🏢 Seeding organizations...")
    
    async with AsyncSessionLocal() as session:
        orgs = [
            Organization(
                name="Highland Property Partners",
                slug="highland-property-partners",
                subscription_tier=SubscriptionTier.ENTERPRISE,
                is_active=True,
            ),
            Organization(
                name="Demo Property Co",
                slug="demo-property-co",
                subscription_tier=SubscriptionTier.PROFESSIONAL,
                is_active=True,
            ),
        ]
        
        session.add_all(orgs)
        await session.commit()
        
        for org in orgs:
            await session.refresh(org)
        
        print(f"✅ Created {len(orgs)} organizations")
        return orgs


async def seed_users(orgs):
    """Seed users"""
    print("\n👥 Seeding users...")
    
    async with AsyncSessionLocal() as session:
        users = [
            # Highland Property Partners
            User(
                org_id=orgs[0].id,
                email="hayden@highland.com",
                password_hash=hash_password("password123"),
                first_name="Hayden",
                last_name="Highland",
                role=UserRole.OWNER,
                is_active=True,
                email_verified=True,
            ),
            User(
                org_id=orgs[0].id,
                email="jenni@highland.com",
                password_hash=hash_password("password123"),
                first_name="Jenni",
                last_name="Portfolio",
                role=UserRole.MANAGER,
                is_active=True,
                email_verified=True,
            ),
            User(
                org_id=orgs[0].id,
                email="hannah@highland.com",
                password_hash=hash_password("password123"),
                first_name="Hannah",
                last_name="Operations",
                role=UserRole.MANAGER,
                is_active=True,
                email_verified=True,
            ),
            # Demo Property Co
            User(
                org_id=orgs[1].id,
                email="demo@demo.com",
                password_hash=hash_password("password123"),
                first_name="Demo",
                last_name="User",
                role=UserRole.OWNER,
                is_active=True,
                email_verified=True,
            ),
        ]
        
        session.add_all(users)
        await session.commit()
        
        print(f"✅ Created {len(users)} users")
        return users


async def seed_owners(orgs):
    """Seed property owners"""
    print("\n👔 Seeding owners...")
    
    async with AsyncSessionLocal() as session:
        owners = [
            Owner(
                org_id=orgs[0].id,
                first_name="Highland",
                last_name="Investment Group LLC",
                email="investors@highland.com",
                phone="555-1000",
            ),
            Owner(
                org_id=orgs[0].id,
                first_name="Smith",
                last_name="Family Trust",
                email="smith@example.com",
                phone="555-1001",
            ),
            Owner(
                org_id=orgs[1].id,
                first_name="Demo",
                last_name="Investor",
                email="investor@demo.com",
                phone="555-1002",
            ),
        ]
        
        session.add_all(owners)
        await session.commit()
        
        for owner in owners:
            await session.refresh(owner)
        
        print(f"✅ Created {len(owners)} owners")
        return owners


async def seed_properties(orgs, owners):
    """Seed properties"""
    print("\n🏘️  Seeding properties...")
    
    async with AsyncSessionLocal() as session:
        properties = [
            # Highland Properties
            Property(
                org_id=orgs[0].id,
                owner_id=owners[0].id,
                name="Sunset Apartments",
                property_type=PropertyType.MULTI_FAMILY,
                address="123 Sunset Blvd",
                city="Los Angeles",
                state="CA",
                zip_code="90001",
                year_built=2018,
                total_units=48,
                square_footage=42000,
            ),
            Property(
                org_id=orgs[0].id,
                owner_id=owners[0].id,
                name="Riverside Commons",
                property_type=PropertyType.MULTI_FAMILY,
                address="456 River Road",
                city="Austin",
                state="TX",
                zip_code="78701",
                year_built=2020,
                total_units=72,
                square_footage=65000,
            ),
            Property(
                org_id=orgs[0].id,
                owner_id=owners[1].id,
                name="Oak Street Townhomes",
                property_type=PropertyType.MULTI_FAMILY,
                address="789 Oak Street",
                city="Portland",
                state="OR",
                zip_code="97201",
                year_built=2019,
                total_units=24,
                square_footage=36000,
            ),
            # Demo Properties
            Property(
                org_id=orgs[1].id,
                owner_id=owners[2].id,
                name="Demo Apartments",
                property_type=PropertyType.MULTI_FAMILY,
                address="999 Demo Drive",
                city="Chicago",
                state="IL",
                zip_code="60601",
                year_built=2021,
                total_units=36,
                square_footage=30000,
            ),
        ]
        
        session.add_all(properties)
        await session.commit()
        
        for prop in properties:
            await session.refresh(prop)
        
        print(f"✅ Created {len(properties)} properties")
        return properties


async def seed_units(properties):
    """Seed units"""
    print("\n🏠 Seeding units...")
    
    async with AsyncSessionLocal() as session:
        units = []
        
        # Sunset Apartments (48 units)
        for floor in range(1, 5):  # 4 floors
            for unit_num in range(1, 13):  # 12 units per floor
                units.append(Unit(
                    org_id=properties[0].org_id,
                    property_id=properties[0].id,
                    unit_number=f"{floor}{unit_num:02d}",
                    bedrooms=2 if unit_num % 3 == 0 else 1,
                    bathrooms=2 if unit_num % 3 == 0 else 1,
                    square_feet=950 if unit_num % 3 == 0 else 700,
                    rent_amount=Decimal("1800") if unit_num % 3 == 0 else Decimal("1400"),
                    deposit_amount=Decimal("1800") if unit_num % 3 == 0 else Decimal("1400"),
                    status=UnitStatus.OCCUPIED if unit_num % 4 != 0 else UnitStatus.AVAILABLE,
                ))
        
        # Riverside Commons (72 units) - Just a sample
        for floor in range(1, 7):  # 6 floors
            for unit_num in range(1, 13):  # 12 units per floor
                units.append(Unit(
                    org_id=properties[1].org_id,
                    property_id=properties[1].id,
                    unit_number=f"{floor}{unit_num:02d}",
                    bedrooms=2,
                    bathrooms=2,
                    square_feet=900,
                    rent_amount=Decimal("1600"),
                    deposit_amount=Decimal("1600"),
                    status=UnitStatus.OCCUPIED if unit_num % 5 != 0 else UnitStatus.AVAILABLE,
                ))
        
        session.add_all(units)
        await session.commit()
        
        print(f"✅ Created {len(units)} units")
        return units


async def seed_leads(orgs, users):
    """Seed leads"""
    print("\n🎯 Seeding leads...")
    
    async with AsyncSessionLocal() as session:
        leads = [
            Lead(
                org_id=orgs[0].id,
                first_name="John",
                last_name="Doe",
                email="john.doe@example.com",
                phone="555-0101",
                source=LeadSource.WEBSITE,
                status=LeadStatus.NEW,
                desired_move_in_date=date.today() + timedelta(days=30),
                min_bedrooms=2,
                max_rent=Decimal("1800"),
            ),
            Lead(
                org_id=orgs[0].id,
                first_name="Jane",
                last_name="Smith",
                email="jane.smith@example.com",
                phone="555-0102",
                source=LeadSource.REFERRAL,
                status=LeadStatus.CONTACTED,
                desired_move_in_date=date.today() + timedelta(days=45),
                min_bedrooms=1,
                max_rent=Decimal("1500"),
            ),
            Lead(
                org_id=orgs[0].id,
                first_name="Bob",
                last_name="Johnson",
                email="bob.j@example.com",
                phone="555-0103",
                source=LeadSource.WALK_IN,
                status=LeadStatus.APPLICATION,
                desired_move_in_date=date.today() + timedelta(days=15),
                min_bedrooms=2,
                max_rent=Decimal("2000"),
            ),
        ]
        
        session.add_all(leads)
        await session.commit()
        
        print(f"✅ Created {len(leads)} leads")
        return leads


async def seed_leases(units, users):
    """Seed leases"""
    print("\n📋 Seeding leases...")
    
    async with AsyncSessionLocal() as session:
        leases = []
        
        # Get some occupied units
        result = await session.execute(
            select(Unit).where(Unit.status == UnitStatus.OCCUPIED).limit(10)
        )
        occupied_units = result.scalars().all()
        
        for i, unit in enumerate(occupied_units[:5]):  # Create 5 leases
            lease = Lease(
                org_id=unit.org_id,
                unit_id=unit.id,
                tenant_first_name=f"Tenant{i+1}",
                tenant_last_name="Resident",
                tenant_email=f"tenant{i+1}@example.com",
                tenant_phone=f"555-{1000+i}",
                start_date=date.today() - timedelta(days=30),
                end_date=date.today() + timedelta(days=335),  # ~11 months
                monthly_rent=unit.rent_amount,
                deposit_amount=unit.deposit_amount,
                status=LeaseStatus.ACTIVE,
                rent_due_day=1,
                late_fee_amount=Decimal("50.00"),
                late_fee_grace_days=5,
            )
            leases.append(lease)
        
        session.add_all(leases)
        await session.commit()
        
        print(f"✅ Created {len(leases)} leases")
        return leases


async def seed_payments(leases):
    """Seed payments"""
    print("\n💳 Seeding payments...")
    
    async with AsyncSessionLocal() as session:
        payments = []
        
        for lease in leases:
            # Create rent payments for the next 3 months
            for month_offset in range(3):
                payment_date = date.today() + timedelta(days=30 * month_offset)
                due_date = payment_date.replace(day=lease.rent_due_day)
                
                payment = Payment(
                    org_id=lease.org_id,
                    lease_id=lease.id,
                    amount=lease.monthly_rent,
                    payment_type="rent",
                    payment_method=PaymentMethod.ACH,
                    due_date=due_date,
                    paid_date=due_date if month_offset == 0 else None,  # First month paid
                    status=PaymentStatus.PAID if month_offset == 0 else PaymentStatus.PENDING,
                )
                payments.append(payment)
        
        session.add_all(payments)
        await session.commit()
        
        print(f"✅ Created {len(payments)} payments")
        return payments


async def seed_maintenance_requests(properties, users):
    """Seed maintenance requests"""
    print("\n🔧 Seeding maintenance requests...")
    
    async with AsyncSessionLocal() as session:
        # Get some units
        result = await session.execute(
            select(Unit).where(Unit.property_id == properties[0].id).limit(5)
        )
        units = result.scalars().all()
        
        maintenance_requests = [
            MaintenanceRequest(
                org_id=properties[0].org_id,
                unit_id=units[0].id if units else None,
                title="Leaking faucet in bathroom",
                description="Resident reported dripping faucet in master bathroom",
                priority=MaintenancePriority.MEDIUM,
                status=MaintenanceStatus.OPEN,
            ),
            MaintenanceRequest(
                org_id=properties[0].org_id,
                unit_id=units[1].id if len(units) > 1 else None,
                title="Air conditioning not cooling",
                description="AC unit running but not producing cold air",
                priority=MaintenancePriority.HIGH,
                status=MaintenanceStatus.IN_PROGRESS,
            ),
            MaintenanceRequest(
                org_id=properties[0].org_id,
                title="Pool pump needs maintenance",
                description="Annual pool pump maintenance due",
                priority=MaintenancePriority.LOW,
                status=MaintenanceStatus.OPEN,
            ),
        ]
        
        session.add_all(maintenance_requests)
        await session.commit()
        
        print(f"✅ Created {len(maintenance_requests)} maintenance requests")
        return maintenance_requests


async def seed_documents(orgs, users, properties):
    """Seed documents"""
    print("\n📄 Seeding documents...")
    
    async with AsyncSessionLocal() as session:
        documents = [
            Document(
                org_id=orgs[0].id,
                filename="lease_agreement_101.pdf",
                file_url="https://storage.example.com/leases/lease_101.pdf",
                file_type="application/pdf",
                file_size=245760,
                document_type="lease",
                uploaded_by=users[0].id,
                property_id=properties[0].id,
            ),
            Document(
                org_id=orgs[0].id,
                filename="property_photos.zip",
                file_url="https://storage.example.com/photos/property_photos.zip",
                file_type="application/zip",
                file_size=5242880,
                document_type="photos",
                uploaded_by=users[1].id,
                property_id=properties[0].id,
            ),
            Document(
                org_id=orgs[0].id,
                filename="maintenance_report.docx",
                file_url="https://storage.example.com/reports/maintenance_report.docx",
                file_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                file_size=128000,
                document_type="report",
                uploaded_by=users[1].id,
            ),
        ]
        
        session.add_all(documents)
        await session.commit()
        
        print(f"✅ Created {len(documents)} documents")
        return documents


async def seed_ai_jobs(orgs, users, documents):
    """Seed AI jobs"""
    print("\n🤖 Seeding AI jobs...")
    
    async with AsyncSessionLocal() as session:
        ai_jobs = [
            AIJob(
                org_id=orgs[0].id,
                job_type="parse_lease",
                status=AIJobStatus.COMPLETED,
                input_data={"filename": "lease_agreement_101.pdf", "file_size": 245760},
                output_data={
                    "monthly_rent": 1800.00,
                    "lease_start_date": "2024-01-01",
                    "lease_end_date": "2024-12-31",
                    "tenant_names": ["John Doe", "Jane Doe"],
                    "confidence_score": 0.95
                },
                document_id=documents[0].id if documents else None,
                created_by=users[0].id,
                started_at=datetime.utcnow() - timedelta(hours=2),
                completed_at=datetime.utcnow() - timedelta(hours=1),
            ),
            AIJob(
                org_id=orgs[0].id,
                job_type="analyze_risks",
                status=AIJobStatus.PROCESSING,
                input_data={"filename": "lease_agreement_101.pdf"},
                document_id=documents[0].id if documents else None,
                created_by=users[0].id,
                started_at=datetime.utcnow() - timedelta(minutes=30),
            ),
        ]
        
        session.add_all(ai_jobs)
        await session.commit()
        
        print(f"✅ Created {len(ai_jobs)} AI jobs")
        return ai_jobs


async def main():
    """Main seeding function"""
    print("🌱 Starting database seed...\n")
    
    try:
        # Create tables
        await create_tables()
        
        # Seed data in order
        orgs = await seed_organizations()
        users = await seed_users(orgs)
        owners = await seed_owners(orgs)
        properties = await seed_properties(orgs, owners)
        units = await seed_units(properties)
        leases = await seed_leases(units, users)
        payments = await seed_payments(leases)
        leads = await seed_leads(orgs, users)
        maintenance_requests = await seed_maintenance_requests(properties, users)
        documents = await seed_documents(orgs, users, properties)
        ai_jobs = await seed_ai_jobs(orgs, users, documents)
        
        print("\n" + "="*60)
        print("🎉 Database seeded successfully!")
        print("="*60)
        print("\n📝 Sample Credentials:")
        print("\nHighland Property Partners:")
        print("  Email: hayden@highland.com")
        print("  Password: password123")
        print("  Role: Owner")
        print("\n  Email: jenni@highland.com")
        print("  Password: password123")
        print("  Role: Manager")
        print("\n  Email: hannah@highland.com")
        print("  Password: password123")
        print("  Role: Manager")
        print("\nDemo Property Co:")
        print("  Email: demo@demo.com")
        print("  Password: password123")
        print("  Role: Owner")
        print("\n" + "="*60)
        
    except Exception as e:
        print(f"\n❌ Error seeding database: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
