"""
Offline evaluation script — generate lessons with each strategy for N topics,
score with all rubrics, write results to CSV.

Usage:
  python -m evaluation.run_eval \\
    --topics "fractions,multiplication,division" \\
    --subject "Mathematics" \\
    --grade 3 \\
    --strategies zpd misconception bkt hybrid \\
    --output results/eval_$(date +%Y%m%d).csv

Output CSV columns:
  topic, strategy, accessibility, reading_level, misconception_coverage,
  activity_count, scaffold_presence, coherence, latency_ms, total_score
"""
import argparse
import asyncio
import csv
import os
import sys
import time
from dataclasses import asdict
from pathlib import Path

# Ensure backend package is on the path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.core.database import SessionLocal
from app.services.gemini_service import get_gemini_service
from app.services.generation.base import GenerationContext
from app.services.generation.registry import STRATEGY_REGISTRY
from app.services.subject_service import SubjectService
from app.services.generation.context_builder import GenerationContextBuilder
from evaluation.rubrics import RUBRICS


async def run_evaluation(
    topics: list[str],
    subject_name: str,
    grade: int,
    strategies: list[str],
    output_path: str,
):
    gemini = get_gemini_service()
    db = SessionLocal()

    subject_svc = SubjectService(db, gemini)
    subject = subject_svc.get_or_create_subject(subject_name)
    await subject_svc.get_or_generate_taxonomy(subject, grade)

    builder = GenerationContextBuilder(db)
    results = []

    print(f"\nEvaluating {len(topics)} topics × {len(strategies)} strategies = {len(topics) * len(strategies)} runs\n")

    for topic in topics:
        ctx = await builder.build(
            topic=topic,
            subject=subject,
            grade_level=grade,
        )
        ctx_dict = {
            "topic": ctx.topic,
            "grade_level": ctx.grade_level,
            "misconception_tags": ctx.misconception_tags,
            "zpd_lower": ctx.zpd_lower,
            "zpd_upper": ctx.zpd_upper,
        }

        for strategy_name in strategies:
            cls = STRATEGY_REGISTRY.get(strategy_name)
            if not cls:
                print(f"  Unknown strategy: {strategy_name} — skipping")
                continue

            strategy = cls(gemini)
            print(f"  {topic!r:40} [{strategy_name:12}] ", end="", flush=True)

            t0 = time.time()
            result = await strategy.generate(ctx)
            latency_ms = int((time.time() - t0) * 1000)

            eval_ctx = {**ctx_dict, "difficulty_level": result.difficulty_level}
            scores: dict[str, float] = {}
            for rubric in RUBRICS:
                try:
                    scores[rubric.name] = round(rubric.score_fn(result.mdx_content, eval_ctx), 3)
                except Exception as e:
                    scores[rubric.name] = 0.0
                    print(f"\n    [WARN] Rubric {rubric.name} failed: {e}", end="")

            total = round(sum(scores.values()) / len(scores), 3)
            print(f"score={total:.3f}  latency={latency_ms}ms")

            results.append({
                "topic": topic,
                "strategy": strategy_name,
                "difficulty_level": result.difficulty_level,
                "latency_ms": latency_ms,
                **scores,
                "total_score": total,
            })

    db.close()

    if not results:
        print("No results generated.")
        return

    # Write CSV
    os.makedirs(os.path.dirname(output_path) if os.path.dirname(output_path) else ".", exist_ok=True)
    fieldnames = list(results[0].keys())
    with open(output_path, "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(results)

    print(f"\nResults written to: {output_path}")
    _print_summary(results, strategies)


def _print_summary(results: list[dict], strategies: list[str]):
    """Print a quick summary table to stdout."""
    print("\n=== SUMMARY (avg total_score by strategy) ===")
    for strategy in strategies:
        strategy_results = [r for r in results if r["strategy"] == strategy]
        if strategy_results:
            avg = sum(r["total_score"] for r in strategy_results) / len(strategy_results)
            avg_latency = sum(r["latency_ms"] for r in strategy_results) / len(strategy_results)
            print(f"  {strategy:14} avg_score={avg:.3f}  avg_latency={int(avg_latency)}ms  n={len(strategy_results)}")
    print()


def main():
    parser = argparse.ArgumentParser(description="Offline evaluation of generation strategies")
    parser.add_argument(
        "--topics",
        type=str,
        default="fractions,multiplication,place value",
        help="Comma-separated list of topics to evaluate",
    )
    parser.add_argument("--subject", type=str, default="Mathematics")
    parser.add_argument("--grade", type=int, default=3)
    parser.add_argument(
        "--strategies",
        nargs="+",
        default=["zpd", "misconception", "bkt", "hybrid"],
        choices=list(STRATEGY_REGISTRY.keys()),
    )
    parser.add_argument("--output", type=str, default="results/eval_results.csv")
    args = parser.parse_args()

    topics = [t.strip() for t in args.topics.split(",") if t.strip()]
    asyncio.run(
        run_evaluation(
            topics=topics,
            subject_name=args.subject,
            grade=args.grade,
            strategies=args.strategies,
            output_path=args.output,
        )
    )


if __name__ == "__main__":
    main()
