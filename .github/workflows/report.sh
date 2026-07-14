#!/usr/bin/env bash
# Markdown reporting helpers for the CI workflow. Sourced by the Report steps;
# everything they write lands on the run's summary page ($GITHUB_STEP_SUMMARY).

# Turns a step outcome / job result into a table cell.
icon() {
    case "$1" in
        success) echo "✅ pass" ;;
        failure) echo "❌ fail" ;;
        cancelled) echo "🚫 cancelled" ;;
        skipped) echo "⏭️ skipped" ;;
        -) echo "—" ;;
        *) echo "⚠️ ${1:-not run}" ;;
    esac
}

# report_checks <section> <label:outcome>...
#
# Prints one section of the summary and exits non-zero if any check failed, so
# the job reflects the checks even though each step ran with continue-on-error.
report_checks() {
    local section="$1"
    shift

    {
        echo "### ${section}"
        echo
        echo "| Check | Result |"
        echo "| --- | --- |"
        for check in "$@"; do
            echo "| ${check%%:*} | $(icon "${check##*:}") |"
        done
        echo
    } >> "$GITHUB_STEP_SUMMARY"

    for check in "$@"; do
        if [ "${check##*:}" != "success" ]; then
            return 1
        fi
    done
}

# report_matrix <name:lint:typecheck:build:tests>...
#
# The run-wide table: one row per package, one column per level of verification.
report_matrix() {
    {
        echo "## CI summary"
        echo
        echo "| | Lint | Typecheck | Build | Tests |"
        echo "| --- | --- | --- | --- | --- |"
        for row in "$@"; do
            IFS=":" read -r name lint typecheck build tests <<< "$row"
            echo "| **${name}** | $(icon "$lint") | $(icon "$typecheck") | $(icon "$build") | $(icon "$tests") |"
        done
        echo
        echo "_Per-check detail is in each job's summary above._"
    } >> "$GITHUB_STEP_SUMMARY"
}
