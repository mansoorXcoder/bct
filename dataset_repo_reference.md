# Dataset / Repository Catalog

A curated catalog of datasets and repositories relevant to **Indian geospatial data, land-use/land-cover (LULC), land registry, synthetic government data, and government-document QA/RAG**.

> **Verification note:** License, size, format, and download information below are based on the source pages checked while preparing this catalog. Where a source does not clearly expose a value, it is marked **Not specified / varies** rather than guessed.

---

## Dataset Catalog

| Dataset / Source | License | Size | Format | Download Method | India Relevance | ML Task |
|---|---|---:|---|---|---|---|
| [India Geodata](https://github.com/yashveeeeeeer/india-geodata) | CC BY 4.0 repo; individual datasets have their own licenses | ~27 GB administrative; ~300 MB electoral; ~1.1 GB census; ~8 GB environment; ~18.5 GB water | Parquet, PMTiles, GeoJSONL, Shapefile, GeoJSON, TopoJSON, KML, CSV, GeoTIFF | GitHub `data/` or GitHub Releases; `gh release download` | **High — India** | GIS, geospatial ML, segmentation, spatial analysis |
| [India LULC / IndiaSat](https://github.com/hariomahlawat/An-open-dataset-for-landuse-classification-in-India-for-Sentinel-2) | Open-use stated by repository; verify current license before redistribution | ~300,000 labeled points | ZIP dataset; GEE assets/scripts; GeoJSON/shapefile boundaries | GitHub; `IndiaSat_dataset.zip`; Google Earth Engine for imagery/workflow | **High — India** | LULC classification, land-change detection |
| [Land-Use / Land-Cover Datasets](https://github.com/r-wenger/land-use-land-cover-datasets) | **Varies by linked dataset** | Varies | Varies | Follow individual dataset links in repository | **Medium / varies** | Remote sensing, LULC benchmarking |
| [Synthetic Government Data Kit](https://github.com/ctrimm/synthetic-gov-data-kit) | Check repository | Not specified | Python / generated datasets / notebooks | GitHub clone/download | **Adaptable — government-data use cases** | Synthetic data generation, policy/rule testing |
| [SyntheticDocQA Government Reports Test](https://huggingface.co/datasets/vidore/syntheticDocQA_government_reports_test) | MIT | 339 MB; 1,000 rows | Parquet; image + text | Hugging Face Datasets / direct files | **Government-focused; not India-specific** | Document QA, visual document retrieval, RAG |
| [SyntheWorld — Zenodo 8349019](https://zenodo.org/records/8349019) | Verify Zenodo record/license before use | 82.4 GB listed files; record reports 44.7 TB data volume for the version | ZIP archives containing dataset data | Zenodo download | **Not India-specific** | Land-cover mapping, building-change detection, remote sensing |
| `vyshnaviii17/land-dataset-500` | Check Kaggle dataset page | Not specified | Kaggle dataset format | KaggleHub | **Potentially relevant; verify coverage** | Land-data ML / classification |
| `stephaniejones/land-registry-data` | Check Kaggle dataset page | Not specified | Kaggle dataset format | KaggleHub | **Potentially relevant; verify geography** | Land registry / property-data ML |
| `natredprice/land-registry` | Check Kaggle kernel | Not specified | Kaggle notebook/resources | `kaggle kernels pull` | **Potentially relevant; verify geography** | Land-registry analysis / ML |

---

# 1. India Geodata

**Repository:** https://github.com/yashveeeeeeer/india-geodata

### Use Case

A unified collection of India's openly licensed geospatial data covering:

- Administrative boundaries
- Electoral boundaries
- Census geometries
- Environment
- Water and hydrology
- Infrastructure
- Transport
- Buildings
- Healthcare
- Education
- Urban data
- Postal/pincode boundaries
- Remote-sensing layers

### Verified Scale

The repository README reports approximately:

- **~27 GB** — administrative boundaries
- **~300 MB** — electoral boundaries
- **~1.1 GB** — census data
- **~8 GB** — environmental data
- **~18.5 GB** — water/hydrology data

### Formats

- Parquet
- PMTiles
- GeoJSONL
- Shapefile
- GeoJSON
- TopoJSON
- KML
- CSV
- GeoTIFF

### License

The repository is licensed under **CC BY 4.0**. Individual datasets can have different licenses, documented in their metadata and the `LICENSES/` directory.

### Download

Small files can be downloaded from `data/`.

Large datasets are distributed through GitHub Releases.

Example:

```bash
# Download state boundary files
gh release download admin/states --dir ./downloads/states

# Download district Parquet files
gh release download admin/districts --pattern "*.parquet" --dir ./downloads/districts

# List available releases
gh release list
```

### Best For

- Indian administrative GIS
- Spatial joins
- Pincode/geography mapping
- Geospatial feature engineering
- Land-record geographic linking
- Map visualization

---

# 2. India Land-Use / Land-Cover Dataset

**Repository:** https://github.com/hariomahlawat/An-open-dataset-for-landuse-classification-in-India-for-Sentinel-2

### Use Case

Pixel-level land-use classification for India using Sentinel-2 and Google Earth Engine.

### Dataset

The repository states that it provides approximately **3 lakh (300,000) labeled points** at 30 m resolution.

### Classes

- Greenery
- Water
- Barren land
- Built-up

### Key Files

```text
IndiaSat_dataset.zip
code/
images/
GEE Assets/
```

Important scripts include:

```text
download_sentinel.js
validation_accuray.js
monthly_prediction.js
final_yearly_prediction.ipynb
temporal_correction.py
```

### Additional Geographic Data

The repository includes/uses:

- India boundary
- Indian state boundaries
- Indian district boundaries
- Indian assembly constituency boundaries

### Download

The primary training dataset is:

```text
IndiaSat_dataset.zip
```

available from the GitHub repository.

The workflow also uses Google Earth Engine for Sentinel imagery and classification.

### Best For

- Indian LULC classification
- Satellite-image ML
- Temporal land-change analysis
- Built-up/green/water/barren classification
- Geospatial deep learning

### License Note

The repository describes the dataset and scripts as available for open use. **Verify the repository's current license/terms before commercial redistribution or repackaging.**

---

# 3. Land-Use / Land-Cover Dataset Directory

**Repository:** https://github.com/r-wenger/land-use-land-cover-datasets

### Use Case

A curated list of datasets and code for remote-sensing LULC applications.

### Examples

The repository includes references such as:

- MultiSenNA
- MultiSenGE
- IEEE GRSS Data Fusion Contest datasets
- TiSeLaC

### Example Dataset

The 2018 TiSeLaC dataset contains:

- 23 Landsat 8 images
- 2014 annual time series
- 30 m resolution
- Reunion Island coverage
- 10 features including spectral bands and derived indices

### License

**Varies by linked dataset.**

This repository is primarily a catalog/reference list, so each underlying dataset should be checked independently.

### Best For

- Finding LULC benchmarks
- Remote-sensing research
- Model comparison
- Dataset discovery
- Multitemporal classification

---

# 4. Synthetic Government Data Kit

**Repository:** https://github.com/ctrimm/synthetic-gov-data-kit

### Use Case

Synthetic government/citizen data generation and policy/rule testing.

### Intended Project Uses

- Synthetic household records
- Income/demographic scenarios
- Policy-rule testing
- Edge-case generation
- Boundary-condition testing
- Rule-ordering validation

### Download

```bash
git clone https://github.com/ctrimm/synthetic-gov-data-kit.git
```

### License / Size / Format

**Verify against the current repository metadata before integration.**

The repository is code-oriented and should be treated differently from a single static dataset.

### Best For

- Synthetic data pipelines
- Government workflow simulation
- Testing decision rules
- Data-quality testing
- Privacy-preserving prototyping

---

# 5. Synthetic Government Reports — DocQA

**Dataset:** https://huggingface.co/datasets/vidore/syntheticDocQA_government_reports_test

### Verified Metadata

| Property | Value |
|---|---|
| Task | Document Question Answering / Visual Document Retrieval |
| Modalities | Image + Text |
| Format | Parquet |
| Language | English |
| License | MIT |
| Rows | 1,000 |
| File size | 339 MB |

### Fields

The dataset includes fields such as:

- `query`
- `answer`
- `image`
- `image_filename`
- `page`
- `model`
- `prompt`
- `source`

### Best For

- Government-report QA
- Multimodal RAG
- Visual document retrieval
- Document understanding
- LLM evaluation

### India Relevance

**Government-focused but not specifically India-specific.**

It can be useful as a baseline/evaluation dataset for a government-document AI system.

---

# 6. SyntheWorld — Zenodo Record 8349019

**Dataset:** https://zenodo.org/records/8349019

### Dataset

**SyntheWorld: A Large-Scale Synthetic Dataset for Land Cover Mapping and Building Change Detection**

Authors listed by the record include:

- Jian Song
- Hongruixuan Chen
- Naoto Yokoya

### Verified File Information

The Zenodo record lists:

| File | Size |
|---|---:|
| `1024.zip` | 52.6 GB |
| `512-1.zip` | 9.8 GB |
| `512-2.zip` | 9.6 GB |
| `512-3.zip` | 10.3 GB |
| **Listed files total** | **82.4 GB** |

The record also reports a much larger overall data-volume figure for the version, so storage requirements should be checked before downloading the complete dataset.

### DOI

```text
10.5281/zenodo.8349019
```

### Best For

- Land-cover mapping
- Building-change detection
- Remote sensing
- Synthetic training data
- Computer vision

### India Relevance

**Not specifically India-focused.**

It may still be useful for transfer learning, benchmarking, or synthetic-data research.

### License

**Verify the current Zenodo record's license before redistribution or commercial use.**

---

# 7. Kaggle — Land Dataset 500

**Dataset:** `vyshnaviii17/land-dataset-500`

### Download

```python
import kagglehub

# Download latest version
path = kagglehub.dataset_download("vyshnaviii17/land-dataset-500")

print("Path to dataset files:", path)
```

### Metadata

| Property | Status |
|---|---|
| Source | Kaggle |
| Dataset ID | `vyshnaviii17/land-dataset-500` |
| Size | Not verified |
| Format | Kaggle dataset; inspect downloaded files |
| License | Verify Kaggle dataset page |
| Geographic coverage | Verify |
| ML task | Land-data ML / experimentation |

### Important

Do not assume that the dataset is India-specific from its name alone. Verify geographic coverage and licensing before using it in the India pipeline.

---

# 8. Kaggle — Land Registry Data

**Dataset:** `stephaniejones/land-registry-data`

### Download

```python
import kagglehub

# Download latest version
path = kagglehub.dataset_download("stephaniejones/land-registry-data")

print("Path to dataset files:", path)
```

### Metadata

| Property | Status |
|---|---|
| Source | Kaggle |
| Dataset ID | `stephaniejones/land-registry-data` |
| Size | Not verified |
| Format | Kaggle dataset; inspect downloaded files |
| License | Verify Kaggle dataset page |
| Geographic coverage | Verify |
| ML task | Land registry / property-data analysis |

### Important

Verify the jurisdiction/country before using this as an India land-record dataset.

---

# 9. Kaggle Kernel — Land Registry

**Kernel:** `natredprice/land-registry`

### Pull

```bash
kaggle kernels pull natredprice/land-registry
```

### Metadata

| Property | Status |
|---|---|
| Source | Kaggle |
| Kernel ID | `natredprice/land-registry` |
| Size | Depends on notebook/resources |
| Format | Kaggle notebook/resources |
| License | Verify Kaggle page |
| Geographic coverage | Verify |
| ML task | Land-registry analysis |

### Best For

- Understanding a land-registry workflow
- Reusing notebook logic
- Exploratory analysis
- Reference implementation

---

# Suggested Project Data Layers

## Layer 1 — Geography

**Goal:** Establish the geographic backbone.

Sources:

- India Geodata
- Administrative boundaries
- Pincode boundaries
- Roads
- Railways
- Healthcare
- Education
- Census geometries

Output:

```text
State → District → Subdistrict/Block → Village → Pincode
```

---

## Layer 2 — Land / LULC

**Goal:** Describe the physical land and its use.

Sources:

- IndiaSat / India LULC
- Other LULC benchmark datasets
- SyntheWorld

Output examples:

```text
Green
Water
Barren
Built-up
```

Potential derived features:

- Land-cover class
- Vegetation indicators
- Built-up percentage
- Land-use change
- Temporal change

---

## Layer 3 — Land Registry

**Goal:** Connect land/property records to geography.

Sources:

- Land-registry datasets
- Kaggle land datasets
- Registry notebooks/workflows

Potential entities:

```text
Property
Parcel
Owner/Entity
Transaction
Registration
Location
Land Type
Area
```

> Any real-world personal information should be handled according to applicable privacy and data-protection requirements.

---

## Layer 4 — Government / Citizen Data

**Goal:** Model policy and citizen-level scenarios without relying on sensitive real-world records.

Source:

- Synthetic Government Data Kit

Potential entities:

```text
Household
Income
Demographics
Eligibility
Policy
Benefit
Application
Decision
```

---

## Layer 5 — Government Documents

**Goal:** Build document-search and question-answering capabilities.

Source:

- SyntheticDocQA Government Reports

Potential pipeline:

```text
PDF / Report
      ↓
Document Parsing
      ↓
OCR / Visual Encoding
      ↓
Chunking / Indexing
      ↓
Vector / Multimodal Retrieval
      ↓
RAG
      ↓
Question Answer
```

---

# Recommended Unified Architecture

```text
                    ┌─────────────────────────┐
                    │      INDIA GEODATA      │
                    │ Boundaries / Pincodes   │
                    │ Infrastructure / Census │
                    └────────────┬────────────┘
                                 │
                                 ▼
                    ┌─────────────────────────┐
                    │       LAND / LULC       │
                    │ Sentinel-2 / IndiaSat   │
                    │ Land-cover / Land-use   │
                    └────────────┬────────────┘
                                 │
                                 ▼
                    ┌─────────────────────────┐
                    │      LAND REGISTRY      │
                    │ Parcels / Properties    │
                    │ Registry / Transactions │
                    └────────────┬────────────┘
                                 │
                                 ▼
                    ┌─────────────────────────┐
                    │  SYNTHETIC GOV DATA     │
                    │ Households / Income     │
                    │ Policy / Eligibility    │
                    └────────────┬────────────┘
                                 │
                                 ▼
                    ┌─────────────────────────┐
                    │    GOV DOCUMENTS / QA   │
                    │ Reports / DocQA / RAG   │
                    └────────────┬────────────┘
                                 │
                                 ▼
                    ┌─────────────────────────┐
                    │      AI APPLICATION     │
                    │ GIS + ML + RAG + QA     │
                    │ Analytics / Prediction  │
                    └─────────────────────────┘
```

---

# Download Commands

## GitHub

```bash
git clone https://github.com/yashveeeeeeer/india-geodata.git

git clone https://github.com/hariomahlawat/An-open-dataset-for-landuse-classification-in-India-for-Sentinel-2.git

git clone https://github.com/r-wenger/land-use-land-cover-datasets.git

git clone https://github.com/ctrimm/synthetic-gov-data-kit.git
```

## Kaggle

```python
import kagglehub

land_path = kagglehub.dataset_download(
    "vyshnaviii17/land-dataset-500"
)

registry_path = kagglehub.dataset_download(
    "stephaniejones/land-registry-data"
)

print("Land dataset:", land_path)
print("Registry dataset:", registry_path)
```

## Kaggle Kernel

```bash
kaggle kernels pull natredprice/land-registry
```

---

# Dataset Selection Guide

| Requirement | Recommended Source |
|---|---|
| Indian administrative boundaries | **India Geodata** |
| Indian pincode/geographic mapping | **India Geodata** |
| Indian land-use classification | **IndiaSat / India LULC** |
| General LULC benchmark discovery | **land-use-land-cover-datasets** |
| Synthetic government/citizen records | **synthetic-gov-data-kit** |
| Government document QA | **SyntheticDocQA** |
| Large-scale synthetic land-cover research | **SyntheWorld** |
| Land-registry experimentation | **Kaggle land-registry datasets** |

---

# Data Validation Checklist

Before incorporating a source into a production or research pipeline:

- [ ] Verify the dataset's current license
- [ ] Record the dataset version/date
- [ ] Record geographic coverage
- [ ] Record temporal coverage
- [ ] Record file formats
- [ ] Record total storage requirements
- [ ] Check missing values
- [ ] Check duplicate records
- [ ] Check label/class definitions
- [ ] Verify coordinate reference system (CRS) for geospatial data
- [ ] Check train/validation/test leakage
- [ ] Verify whether personal or sensitive information exists
- [ ] Confirm redistribution/commercial-use permissions
- [ ] Record citation requirements
- [ ] Store source URL and download date

---

# Source Links

1. https://github.com/yashveeeeeeer/india-geodata
2. https://github.com/hariomahlawat/An-open-dataset-for-landuse-classification-in-India-for-Sentinel-2
3. https://github.com/r-wenger/land-use-land-cover-datasets
4. https://github.com/ctrimm/synthetic-gov-data-kit
5. https://huggingface.co/datasets/vidore/syntheticDocQA_government_reports_test
6. https://zenodo.org/records/8349019
7. https://www.kaggle.com/datasets/vyshnaviii17/land-dataset-500
8. https://www.kaggle.com/datasets/stephaniejones/land-registry-data
9. https://www.kaggle.com/code/natredprice/land-registry

---

## Notes

This is a working catalog rather than a guarantee that every source is suitable for production use. Dataset contents, licenses, repository structures, and availability can change.

For any dataset marked **Verify**, inspect the original source before integrating it into a published, commercial, or production system.
