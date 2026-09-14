from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import declarative_base, sessionmaker

from app.config import settings

engine = create_engine(settings.database_url, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def migrate_guest_codes() -> None:
    inspector = inspect(engine)
    if "guests" not in inspector.get_table_names():
        return
    if "guest_code" in {column["name"] for column in inspector.get_columns("guests")}:
        return

    with engine.begin() as connection:
        connection.execute(text("ALTER TABLE guests ADD COLUMN guest_code VARCHAR(10)"))
        guest_ids = connection.execute(
            text("SELECT id FROM guests ORDER BY created_at, id")
        ).fetchall()
        for guest_number, (guest_id,) in enumerate(guest_ids, start=1):
            connection.execute(
                text("UPDATE guests SET guest_code = :guest_code WHERE id = :guest_id"),
                {"guest_code": f"G-{guest_number:04d}", "guest_id": guest_id},
            )
        connection.execute(
            text("CREATE UNIQUE INDEX IF NOT EXISTS ix_guests_guest_code ON guests (guest_code)")
        )


def migrate_walk_in_columns() -> None:
    inspector = inspect(engine)
    tables = set(inspector.get_table_names())
    if "guests" in tables:
        guest_columns = {column["name"] for column in inspector.get_columns("guests")}
        with engine.begin() as connection:
            if "id_type" not in guest_columns:
                connection.execute(text("ALTER TABLE guests ADD COLUMN id_type VARCHAR"))
            if "id_number" not in guest_columns:
                connection.execute(text("ALTER TABLE guests ADD COLUMN id_number VARCHAR"))
            if "is_active" not in guest_columns:
                connection.execute(
                    text("ALTER TABLE guests ADD COLUMN is_active BOOLEAN DEFAULT TRUE")
                )
    if "reservations" in tables:
        reservation_columns = {column["name"] for column in inspector.get_columns("reservations")}
        if "number_of_guests" not in reservation_columns:
            with engine.begin() as connection:
                connection.execute(
                    text("ALTER TABLE reservations ADD COLUMN number_of_guests INTEGER DEFAULT 1")
                )
        reservation_columns = {column["name"] for column in inspect(engine).get_columns("reservations")}
        with engine.begin() as connection:
            if "check_in_time" not in reservation_columns:
                connection.execute(text("ALTER TABLE reservations ADD COLUMN check_in_time TIME"))
            if "check_out_time" not in reservation_columns:
                connection.execute(text("ALTER TABLE reservations ADD COLUMN check_out_time TIME"))
            if engine.dialect.name == "postgresql":
                connection.execute(
                    text(
                        "ALTER TABLE reservations ALTER COLUMN check_in_time "
                        "TYPE TIME USING check_in_time::time"
                    )
                )
                connection.execute(
                    text(
                        "ALTER TABLE reservations ALTER COLUMN check_out_time "
                        "TYPE TIME USING check_out_time::time"
                    )
                )


def get_db():
    """FastAPI dependency: yields a request-scoped SQLAlchemy session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
