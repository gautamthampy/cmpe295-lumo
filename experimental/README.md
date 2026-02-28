# LUMO Experimental

This directory contains experiments, baseline reproductions, and simulations for research validation.

## Purpose

- Reproduce state-of-the-art (SOTA) baselines from literature
- Run simulations for algorithm testing
- Experiment with different LLM prompting strategies
- Validate attention scoring algorithms
- Test mastery prediction models

## Structure (To Be Created in Phase 2-3)

```
experimental/
├── baselines/          # SOTA baseline implementations
│   ├── quiz_generation/
│   ├── hint_systems/
│   └── attention_models/
├── simulations/        # Simulation scripts
│   ├── user_behavior/
│   └── learning_curves/
├── notebooks/          # Jupyter notebooks for analysis
├── data/              # Experimental datasets
└── results/           # Experiment results and plots
```

## Getting Started

### Setup Environment

```bash
cd experimental

# Create virtual environment
uv venv
source .venv/bin/activate  # Windows: .\.venv\Scripts\activate

# Install dependencies
uv pip install jupyter numpy pandas matplotlib scikit-learn torch transformers
```

### Run Experiments

```bash
# Start Jupyter
jupyter notebook

# Or run specific script
python baselines/quiz_generation/distractor_generation.py
```

## Baseline Reproductions

### Quiz Generation
- Implement distractor generation algorithms from literature
- Compare deterministic vs. LLM-based approaches
- Measure plausibility and effectiveness

### Hint Systems
- Reproduce tiered hint strategies
- Test Socratic questioning approaches
- Evaluate hint effectiveness on mastery

### Attention Modeling
- Implement attention scoring algorithms
- Test drift detection methods
- Validate break scheduling strategies

## Simulation Framework

Simulate user interactions to:
- Test algorithm performance
- Validate dashboard metrics
- Stress-test backend APIs
- Generate synthetic training data

## Data Privacy

**Important**: 
- No real student data in this directory
- Use only synthetic or publicly available datasets
- Follow privacy guardrails from `contracts/PRIVACY_GUARDRAILS.md`

## Documentation

Document all experiments with:
- Purpose and hypothesis
- Methodology
- Results and analysis
- Code and configuration
- Visualizations

## Contributing Experiments

1. Create experiment subdirectory
2. Add README with purpose and methodology
3. Include requirements.txt for dependencies
4. Document results in markdown or notebook
5. Share findings with team

## Next Steps (Phase 2-3)

1. Set up baseline quiz generation
2. Implement hint evaluation metrics
3. Create user behavior simulation
4. Build attention scoring prototype
5. Validate against synthetic data
6. Prepare for Phase 4 integration

## Resources

- Research papers in `docs/`
- Baseline algorithms documentation
- Dataset sources and licenses
