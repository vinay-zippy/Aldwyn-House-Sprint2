from tests.factories import make_folio, make_property_guest_plan, make_reservation


def test_get_folio(client, db_session):
    property_, guest, rate_plan = make_property_guest_plan(db_session)
    reservation = make_reservation(db_session, guest, property_, rate_plan)
    folio = make_folio(
        db_session,
        reservation,
        line_items=[
            {"description": "2 nights - Standard Rate", "amount": 200.0},
            {"description": "Resort fee", "amount": 20.0},
        ],
        balance=220.0,
    )
    db_session.commit()

    resp = client.get(f"/api/v1/folios/{folio.id}")
    assert resp.status_code == 200
    body = resp.json()
    assert body["reservation_id"] == reservation.id
    assert body["balance"] == "220.00"
    assert len(body["line_items"]) == 2


def test_get_folio_not_found_returns_404(client, db_session):
    resp = client.get("/api/v1/folios/does-not-exist")
    assert resp.status_code == 404
