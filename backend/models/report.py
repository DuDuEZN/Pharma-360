"""
Report Model for Pharmacie 360 Backend
SQLAlchemy model for generating various reports
"""

from datetime import date
from typing import TYPE_CHECKING, Optional

from sqlalchemy import Date, DateTime, ForeignKey, Integer, Numeric, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base

if TYPE_CHECKING:
    from .user import User


class Report(Base):
    """
    Report model for storing generated reports metadata

    This model tracks report generation history and provides
    metadata about generated reports (sales, stock, cash reports).
    """

    __tablename__ = "reports"

    # Columns
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    report_type: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        index=True,
        comment="Type of report: 'sales', 'stock', 'cash', 'daily', 'monthly', 'custom'",
    )
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    generated_by: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    parameters: Mapped[Optional[dict]] = mapped_column(
        Text, default="{}", nullable=False, comment="JSON string of report parameters"
    )
    file_path: Mapped[Optional[str]] = mapped_column(
        String(500), nullable=True, comment="Path to generated file (PDF, CSV, Excel)"
    )
    file_format: Mapped[Optional[str]] = mapped_column(
        String(10), nullable=True, comment="Format: 'pdf', 'csv', 'xlsx'"
    )
    data_range_start: Mapped[Optional[date]] = mapped_column(
        Date, nullable=True, index=True
    )
    data_range_end: Mapped[Optional[date]] = mapped_column(
        Date, nullable=True, index=True
    )
    total_records: Mapped[int] = mapped_column(
        Integer, default=0, nullable=False, comment="Total number of records in report"
    )
    total_amount: Mapped[float] = mapped_column(
        Numeric(12, 2),
        default=0.00,
        nullable=False,
        comment="Total amount (for sales/cash reports)",
    )
    status: Mapped[str] = mapped_column(
        String(20),
        default="generated",
        nullable=False,
        index=True,
        comment="Status: 'pending', 'generating', 'generated', 'failed'",
    )
    generated_at: Mapped[Optional[date]] = mapped_column(
        DateTime, default=func.current_timestamp(), nullable=False, index=True
    )

    # Relationships
    generated_by_user: Mapped[Optional["User"]] = relationship(
        "User", foreign_keys=[generated_by], back_populates="generated_reports"
    )

    def __repr__(self) -> str:
        return f"<Report(id={self.id}, type={self.report_type}, title={self.title}, status={self.status})>"

    @property
    def is_pdf(self) -> bool:
        """Check if report is in PDF format"""
        return self.file_format == "pdf"

    @property
    def is_spreadsheet(self) -> bool:
        """Check if report is in spreadsheet format"""
        return self.file_format in ["csv", "xlsx"]

    @property
    def duration_days(self) -> int:
        """Calculate duration in days for the report"""
        if self.data_range_start and self.data_range_end:
            return (self.data_range_end - self.data_range_start).days + 1
        return 0


# Add relationship to User model
