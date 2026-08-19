"""
Timetable Constraint Satisfaction Solver Package.
Powered by Google OR-Tools CP-SAT Engine with UGC Workload Compliance.
"""
from .cp_solver import (
    solve_timetable,
    find_available_proxy,
    DAYS,
    DEFAULT_SLOTS,
    GenerateRequest,
    RescheduleRequest,
    SubjectInput,
    TeacherInput,
    SectionInput,
)

__all__ = [
    "solve_timetable",
    "find_available_proxy",
    "DAYS",
    "DEFAULT_SLOTS",
    "GenerateRequest",
    "RescheduleRequest",
    "SubjectInput",
    "TeacherInput",
    "SectionInput",
]
