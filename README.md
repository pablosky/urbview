
HOW TO RUN THE APP:

  docker compose up --build

SCRIPT for downloading parquet:

 python /scripts/extract_overture.py

RUN MIGRATIONS:

  python manage.py migrate

RUN TESTS

 docker compose exec api python manage.py test kpis
