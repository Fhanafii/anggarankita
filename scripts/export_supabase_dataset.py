#!/usr/bin/env python3
"""Export the existing AnggaranKita Supabase tables to reviewable CSV files.

Uses the Supabase PostgREST read API with explicit range pagination. This script
only issues GET requests and never writes to Supabase.
"""

from __future__ import annotations

import argparse
import csv
import json
import os
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

VERSION = "1.0.0"
ROOT = Path(__file__).resolve().parents[1]
APBD_COLUMNS = [
    "region_code", "year", "account_code", "account_name", "account_group",
    "parent_account_code", "level", "budget", "realization",
    "realization_percentage", "source_url", "source_name",
    "source_updated_at", "source_note",
]
REGION_COLUMNS = ["code", "name", "type", "parent_code", "province_code", "centroid_lat", "centroid_lng"]
HIERARCHY_COLUMNS = ["account_code", "account_name", "account_group", "parent_account_code", "level", "year"]
ALLOWED_GROUPS = {"revenue", "expenditure", "financing"}


class ExportError(Exception):
    pass


def load_local_env() -> None:
    """Load simple KEY=VALUE entries without overriding the process environment."""
    for filename in (".env", ".env.local"):
        path = ROOT / filename
        if not path.is_file():
            continue
        for raw in path.read_text(encoding="utf-8").splitlines():
            line = raw.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            key, value = key.strip(), value.strip()
            if value[:1] in ("'", '"') and value[-1:] == value[:1]:
                value = value[1:-1]
            if key and key not in os.environ:
                os.environ[key] = value


def fetch_table(base_url: str, api_key: str, table: str, columns: list[str], page_size: int) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    offset = 0
    select = ",".join(columns)
    while True:
        # Stable pagination uses the table's unique key.
        query = f"select={urllib.parse.quote(select, safe=',')}"
        key = "code" if table == "regions" else "id"
        query += f"&order={key}.asc"
        url = f"{base_url.rstrip('/')}/rest/v1/{table}?{query}"
        request = urllib.request.Request(url, headers={
            "apikey": api_key,
            "Authorization": f"Bearer {api_key}",
            "Range-Unit": "items",
            "Range": f"{offset}-{offset + page_size - 1}",
            "Prefer": "count=exact",
            "Accept": "application/json",
            "User-Agent": f"AnggaranKita-dataset-export/{VERSION}",
        })
        for attempt in range(3):
            try:
                with urllib.request.urlopen(request, timeout=45) as response:
                    payload = response.read().decode("utf-8")
                    page = json.loads(payload)
                break
            except urllib.error.HTTPError as exc:
                if exc.code not in (429, 500, 502, 503, 504) or attempt == 2:
                    # Do not print the URL, headers, or response body (may expose deployment details).
                    raise ExportError(f"Gagal membaca tabel {table} (HTTP {exc.code}). Periksa URL, key, izin SELECT, dan koneksi.") from None
                time.sleep(0.5 * (attempt + 1))
            except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as exc:
                if attempt == 2:
                    reason = "respons JSON tidak valid" if isinstance(exc, json.JSONDecodeError) else "koneksi gagal"
                    raise ExportError(f"Gagal membaca tabel {table}: {reason} setelah 3 percobaan.") from None
                time.sleep(0.5 * (attempt + 1))
        if not isinstance(page, list):
            raise ExportError(f"Respons tabel {table} bukan daftar JSON yang valid.")
        rows.extend(page)
        if len(page) < page_size:
            break
        offset += len(page)
    return rows


def csv_value(value: Any) -> Any:
    return "" if value is None else value


def write_csv(path: Path, columns: list[str], rows: list[dict[str, Any]]) -> None:
    with path.open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=columns, extrasaction="ignore")
        writer.writeheader()
        writer.writerows({key: csv_value(row.get(key)) for key in columns} for row in rows)


def validate(apbd: list[dict[str, Any]], regions: list[dict[str, Any]], selected_years: set[int] | None) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    errors: list[dict[str, Any]] = []
    warnings: list[dict[str, Any]] = []
    region_codes = {str(row.get("code")) for row in regions if row.get("code") is not None}
    seen: set[tuple[str, int, str]] = set()
    for index, row in enumerate(apbd, start=1):
        year, region, account = row.get("year"), row.get("region_id"), row.get("account_code")
        try:
            year_int = int(year)
        except (TypeError, ValueError):
            errors.append({"severity": "ERROR", "message": f"Record APBD baris {index}: year tidak valid."})
            continue
        if selected_years is not None and year_int not in selected_years:
            continue
        code = str(account) if account is not None else ""
        region_code = str(region) if region is not None else ""
        if not code or not region_code:
            errors.append({"severity": "ERROR", "message": f"Record APBD baris {index}: region_id/account_code kosong."})
        identity = (region_code, year_int, code)
        if identity in seen:
            errors.append({"severity": "ERROR", "message": f"Duplikat (region_code, year, account_code): {identity}."})
        seen.add(identity)
        if region_code and region_code not in region_codes:
            warnings.append({"severity": "WARNING", "message": f"Kode wilayah {region_code} tidak ditemukan di regions."})
        if row.get("account_group") not in ALLOWED_GROUPS:
            errors.append({"severity": "ERROR", "message": f"account_group tidak valid pada {region_code}/{year_int}/{code}."})
        for col in ("budget", "realization", "realization_percentage"):
            value = row.get(col)
            if value is not None:
                try:
                    float(value)
                except (TypeError, ValueError):
                    errors.append({"severity": "ERROR", "message": f"Nilai {col} tidak numerik pada {region_code}/{year_int}/{code}."})
        if not row.get("source_url"):
            errors.append({"severity": "ERROR", "message": f"source_url kosong pada {region_code}/{year_int}/{code}."})
    return errors, warnings


def make_dictionary() -> list[dict[str, str]]:
    specs: dict[str, tuple[str, str, str, str]] = {
        "region_code": ("text", "Kode wilayah", "", "Identifier teks; format sumber dipertahankan."),
        "year": ("integer", "Tahun anggaran", "tahun", ""),
        "account_code": ("text", "Kode akun", "", "Identifier teks; format sumber dipertahankan."),
        "account_name": ("text", "Nama akun dari sumber", "", "Tidak diubah."),
        "account_group": ("text", "Kelompok akun", "", "Nilai: revenue, expenditure, atau financing."),
        "parent_account_code": ("text", "Kode akun induk", "", "Identifier teks; kosong bila tidak tersedia."),
        "level": ("integer", "Tingkat hierarki akun", "tingkat", ""),
        "budget": ("integer", "Anggaran", "rupiah", "NULL menjadi sel kosong, bukan nol."),
        "realization": ("integer", "Realisasi", "rupiah", "NULL menjadi sel kosong, bukan nol."),
        "realization_percentage": ("decimal", "Persentase realisasi dari sumber", "%", "Nilai sumber dipertahankan tanpa perhitungan ulang."),
        "source_url": ("text", "URL sumber pada record", "", ""),
        "source_name": ("text", "Nama sumber", "", ""),
        "source_updated_at": ("text", "Waktu pembaruan sumber", "", "Nilai sebagaimana sumber; belum tentu ISO."),
        "source_note": ("text", "Catatan sumber", "", ""),
        "code": ("text", "Kode wilayah", "", "Identifier teks."),
        "name": ("text", "Nama wilayah", "", ""),
        "type": ("text", "Jenis wilayah", "", "province, regency, atau city."),
        "parent_code": ("text", "Kode wilayah induk", "", "Identifier teks."),
        "province_code": ("text", "Kode provinsi", "", "Identifier teks."),
        "centroid_lat": ("decimal", "Lintang centroid", "derajat", ""),
        "centroid_lng": ("decimal", "Bujur centroid", "derajat", ""),
    }
    files = {"apbd_<tahun>.csv": APBD_COLUMNS, "regions.csv": REGION_COLUMNS, "account_hierarchy.csv": HIERARCHY_COLUMNS}
    out = []
    for filename, columns in files.items():
        for column in columns:
            dtype, description, unit, notes = specs[column]
            out.append({"file_name": filename, "column_name": column, "data_type": dtype, "description": description,
                        "unit": unit, "nullable": "yes", "notes": notes or "Nilai kosong berarti tidak tersedia/tidak tercatat, bukan nol."})
    return out


def main() -> int:
    parser = argparse.ArgumentParser(description="Ekspor dataset publik dari tabel Supabase (read-only).")
    parser.add_argument("--output-dir", default=None, help="Direktori output (default: EXPORT_OUTPUT_DIR atau output/anggaran_kita_apbd).")
    parser.add_argument("--years", nargs="+", type=int, help="Batasi ekspor ke tahun yang tersedia.")
    parser.add_argument("--dry-run", action="store_true", help="Baca dan validasi data, tanpa menulis file.")
    parser.add_argument("--page-size", type=int, default=1000, help="Jumlah baris per permintaan (default: 1000).")
    args = parser.parse_args()
    if args.page_size < 1 or args.page_size > 1000:
        parser.error("--page-size harus antara 1 dan 1000.")

    load_local_env()
    base_url = os.getenv("SUPABASE_URL") or os.getenv("NEXT_PUBLIC_SUPABASE_URL")
    api_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    if not base_url or not api_key:
        print("ERROR: SUPABASE_URL (atau NEXT_PUBLIC_SUPABASE_URL) dan SUPABASE_SERVICE_ROLE_KEY wajib diatur.", file=sys.stderr)
        return 2

    try:
        apbd_all = fetch_table(base_url, api_key, "apbd_records", ["id", "region_id", "year", "account_code", "account_name", "account_group", "parent_account_code", "level", "budget", "realization", "realization_percentage", "source_url", "source_name", "source_updated_at", "source_note"], args.page_size)
        regions_all = fetch_table(base_url, api_key, "regions", ["code", "name", "type", "parent_code", "province_code", "centroid_lat", "centroid_lng"], args.page_size)
    except ExportError as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 2

    available = sorted({int(row["year"]) for row in apbd_all if row.get("year") is not None})
    if args.years:
        unavailable = sorted(set(args.years) - set(available))
        if unavailable:
            print(f"ERROR: Tahun tidak tersedia di database: {', '.join(map(str, unavailable))}. Tersedia: {available}", file=sys.stderr)
            return 2
        years = sorted(set(args.years))
    else:
        years = available
    apbd = [row for row in apbd_all if int(row.get("year", -1)) in years]
    errors, warnings = validate(apbd, regions_all, None)
    region_codes_selected = {str(row.get("region_id")) for row in apbd if row.get("region_id") is not None}
    regions = sorted(regions_all, key=lambda row: str(row.get("code", "")))

    grouped: dict[int, list[dict[str, Any]]] = defaultdict(list)
    for row in apbd:
        grouped[int(row["year"])].append({"region_code": str(row.get("region_id", "")), **row})
    for year in grouped:
        grouped[year].sort(key=lambda row: (str(row.get("region_code", "")), str(row.get("account_code", ""))))

    metadata: dict[str, dict[str, Any]] = {}
    for row in apbd:
        code = str(row.get("account_code", ""))
        signature = tuple(row.get(key) for key in ("account_name", "account_group", "parent_account_code", "level"))
        metadata.setdefault(code, {})[json.dumps(signature, ensure_ascii=False, default=str)] = signature
    conflicts = [code for code, variants in metadata.items() if len(variants) > 1]
    for code in conflicts:
        warnings.append({"severity": "WARNING", "message": f"Metadata account_code {code} berubah antar tahun; hierarchy menyimpan baris per tahun."})
    hierarchy = []
    unique_hierarchy: set[tuple[Any, ...]] = set()
    for row in apbd:
        item = {key: row.get(key) for key in ("account_code", "account_name", "account_group", "parent_account_code", "level", "year")}
        signature = tuple(item[key] for key in HIERARCHY_COLUMNS)
        if signature not in unique_hierarchy:
            unique_hierarchy.add(signature)
            hierarchy.append(item)
    hierarchy.sort(key=lambda row: (str(row["account_code"]), int(row["year"])))

    missing_budget = sum(row.get("budget") is None for row in apbd)
    missing_realization = sum(row.get("realization") is None for row in apbd)
    now = datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")
    print(f"INFO: {len(apbd)} record APBD, {len(regions)} wilayah, tahun: {years or 'tidak ada data'}.")
    print(f"INFO: budget kosong {missing_budget}; realization kosong {missing_realization}; konflik metadata akun {len(conflicts)}.")
    for issue in warnings:
        print(f"WARNING: {issue['message']}")
    for issue in errors:
        print(f"ERROR: {issue['message']}")
    if args.dry_run:
        print("DRY-RUN: validasi selesai; tidak ada file yang ditulis.")
        return 1 if errors else 0

    output_dir = Path(args.output_dir or os.getenv("EXPORT_OUTPUT_DIR", "output/anggaran_kita_apbd"))
    if not output_dir.is_absolute():
        output_dir = ROOT / output_dir
    try:
        output_dir.mkdir(parents=True, exist_ok=True)
        file_counts: dict[str, int] = {}
        for year in years:
            filename = f"apbd_{year}.csv"
            write_csv(output_dir / filename, APBD_COLUMNS, grouped.get(year, []))
            file_counts[filename] = len(grouped.get(year, []))
        write_csv(output_dir / "regions.csv", REGION_COLUMNS, regions)
        file_counts["regions.csv"] = len(regions)
        write_csv(output_dir / "account_hierarchy.csv", HIERARCHY_COLUMNS, hierarchy)
        file_counts["account_hierarchy.csv"] = len(hierarchy)
        dictionary = make_dictionary()
        write_csv(output_dir / "data_dictionary.csv", ["file_name", "column_name", "data_type", "description", "unit", "nullable", "notes"], dictionary)
        file_counts["data_dictionary.csv"] = len(dictionary)
        report = errors + warnings
        manifest = {
            "exported_at_utc": now, "script_version": VERSION, "years": years,
            "record_counts": file_counts, "region_count": len(regions),
            "validation": {"status": "failed" if errors else ("warning" if warnings else "passed"), "error_count": len(errors), "warning_count": len(warnings), "issues": report},
            "statistics": {"apbd_record_count": len(apbd), "budget_null_count": missing_budget, "realization_null_count": missing_realization},
        }
        (output_dir / "export_manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        file_counts["export_manifest.json"] = 1
        source_urls = sorted({str(row["source_url"]) for row in apbd if row.get("source_url")})
        readme = ["# Dataset APBD AnggaranKita", "", "Dataset ini menata hasil ekstraksi data APBD yang tersimpan pada AnggaranKita untuk pemeriksaan dan analisis. Sumber record tercatat sebagai DJPK SIKD.", "",
                  f"- Tanggal ekspor: {now}", f"- Tahun: {', '.join(map(str, years)) if years else 'tidak ada data'}", f"- Wilayah unik pada record: {len(region_codes_selected)}", f"- Wilayah dengan metadata tersedia: {len(regions)}",
                  "- URL sumber yang tercatat: " + (", ".join(source_urls) if source_urls else "tidak tersedia"), "", "## File", "",
                  "- `apbd_<tahun>.csv`: record APBD per tahun, diurutkan berdasarkan kode wilayah dan akun.", "- `regions.csv`: metadata wilayah tanpa geometri.", "- `account_hierarchy.csv`: metadata akun unik per tahun; kolom `year` menjaga variasi historis.", "- `data_dictionary.csv`: definisi kolom dan satuan.", "- `export_manifest.json`: waktu, jumlah baris, statistik, serta hasil validasi.", "",
                  "## Skema dan transformasi", "", "CSV menggunakan UTF-8 dengan BOM agar mudah dibuka di Excel. Nilai uang adalah integer rupiah. `realization_percentage` mempertahankan nilai sumber dan tidak dihitung ulang. Nilai SQL NULL menjadi sel kosong; sel kosong berarti tidak tersedia/tidak tercatat, bukan nol. Kode akun dan wilayah diekspor sebagai teks. Nama akun tidak diubah. Kolom operasional database dan geometri tidak disertakan.", "",
                  "## Validasi", "", f"Status: **{'ERROR' if errors else ('WARNING' if warnings else 'LULUS')}**. Ditemukan {len(errors)} error dan {len(warnings)} warning. Anggaran kosong: {missing_budget}; realisasi kosong: {missing_realization}. Konflik metadata akun: {len(conflicts)}.", "",
                  "Validasi mencakup struktur dan kelompok akun, duplikasi kunci, referensi wilayah, tipe numerik, serta URL sumber. Record bermasalah tidak dihapus. Rincian tersedia di `export_manifest.json`.", "",
                  "## Sumber dan batasan", "", "Dataset merupakan hasil ekstraksi dan penataan untuk analisis, bukan pengganti sumber resmi. Periksa DJPK SIKD untuk nilai terbaru atau koreksi. Kelengkapan dan ketepatan mengikuti data yang tersimpan pada saat ekspor.", "",
                  "## Lisensi", "", "Lisensi redistribusi belum diverifikasi. Pemilik dataset perlu memeriksa ketentuan sumber DJPK dan hak redistribusi sebelum publikasi atau pengunggahan ke Kaggle.", ""]
        (output_dir / "README.md").write_text("\n".join(readme), encoding="utf-8")
        file_counts["README.md"] = 1
        # Keep manifest counts comprehensive, including documentation files.
        manifest["record_counts"] = file_counts
        (output_dir / "export_manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    except OSError as exc:
        print(f"ERROR: Gagal menulis output di {output_dir}: {exc}", file=sys.stderr)
        return 2
    print(f"INFO: Output tersimpan di {output_dir}.")
    return 1 if errors else 0


if __name__ == "__main__":
    raise SystemExit(main())
