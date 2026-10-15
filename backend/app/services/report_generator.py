import io
import csv
from typing import Dict, Any
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.units import inch
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    HRFlowable
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

from app.models.schemas import AnalysisResponse


class ReportGenerator:
    """
    Generates downloadable data artifacts:
    1. Comprehensive CSV export containing annual metrics and event logs.
    2. Professional PDF summary report for stakeholders.
    """

    @staticmethod
    def generate_csv(data: AnalysisResponse) -> str:
        """Create a clean CSV representation of analysis and events."""
        output = io.StringIO()
        writer = csv.writer(output)

        # Metadata Header
        writer.writerow(["# Climate Hazard Trend Analysis Report"])
        writer.writerow(["# Location", data.location_name])
        writer.writerow(["# Latitude", data.latitude])
        writer.writerow(["# Longitude", data.longitude])
        writer.writerow(["# Hazard Type", data.hazard_type.upper()])
        writer.writerow(["# Time Range", f"{data.start_year} - {data.end_year}"])
        writer.writerow(["# Percentile Threshold", f"{data.percentile_threshold}% ({data.threshold_value} {data.units})"])
        writer.writerow(["# Headline", data.summary.headline])
        writer.writerow(["# Relative Change", f"{data.trend.percent_change_since_baseline}%"])
        writer.writerow(["# Mann-Kendall p-value", data.trend.mann_kendall_p])
        writer.writerow(["# Sen's Slope", data.trend.sens_slope])
        writer.writerow([])

        # Section 1: Annual Time Series
        writer.writerow([
            "Year",
            "Event Count",
            "Total Hazard Days",
            "Max Duration (Days)",
            "Mean Intensity",
            f"Annual Max Temp ({data.units})",
            f"Annual Mean Temp ({data.units})",
            "5-Year Rolling Count"
        ])
        for row in data.annual_metrics:
            writer.writerow([
                row.year,
                row.event_count,
                row.total_hazard_days,
                row.max_duration_days,
                row.mean_intensity,
                row.annual_max_temp,
                row.annual_mean_temp,
                row.rolling_5y_count if row.rolling_5y_count is not None else ""
            ])

        writer.writerow([])
        # Section 2: Detailed Detected Events
        writer.writerow([
            "Event ID",
            "Year",
            "Start Date",
            "End Date",
            "Duration (Days)",
            f"Peak Value ({data.units})",
            f"Mean Value ({data.units})",
            "Intensity Score",
            "Severity"
        ])
        for ev in data.events:
            writer.writerow([
                ev.event_id,
                ev.year,
                ev.start_date,
                ev.end_date,
                ev.duration_days,
                ev.peak_value,
                ev.mean_value,
                ev.intensity_score,
                ev.severity
            ])

        return output.getvalue()

    @staticmethod
    def generate_pdf(data: AnalysisResponse) -> bytes:
        """Render a publication-ready PDF climate hazard report."""
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=letter,
            rightMargin=36,
            leftMargin=36,
            topMargin=36,
            bottomMargin=36
        )
        styles = getSampleStyleSheet()

        # Custom paragraph styles
        title_style = ParagraphStyle(
            'DocTitle',
            parent=styles['Heading1'],
            fontSize=22,
            leading=26,
            textColor=colors.HexColor('#0f172a'),
            spaceAfter=4
        )
        subtitle_style = ParagraphStyle(
            'DocSubTitle',
            parent=styles['Normal'],
            fontSize=11,
            leading=14,
            textColor=colors.HexColor('#64748b'),
            spaceAfter=12
        )
        h2_style = ParagraphStyle(
            'SectionH2',
            parent=styles['Heading2'],
            fontSize=14,
            leading=18,
            textColor=colors.HexColor('#1e293b'),
            spaceBefore=10,
            spaceAfter=6
        )
        body_style = ParagraphStyle(
            'BodyText',
            parent=styles['Normal'],
            fontSize=10,
            leading=14,
            textColor=colors.HexColor('#334155')
        )
        headline_style = ParagraphStyle(
            'CalloutHeadline',
            parent=styles['Normal'],
            fontSize=13,
            leading=17,
            textColor=colors.HexColor('#c2410c'),
            fontName='Helvetica-Bold'
        )

        elements = []

        # Title & Subtitle
        elements.append(Paragraph("Climate Hazard Trend Analysis Report", title_style))
        elements.append(Paragraph(
            f"Region: <b>{data.location_name}</b> ({data.latitude:.2f}°, {data.longitude:.2f}°) | "
            f"Hazard: <b>{data.hazard_type.upper()}</b> | Period: <b>{data.start_year}–{data.end_year}</b>",
            subtitle_style
        ))
        elements.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#e2e8f0'), spaceAfter=12))

        # Executive Takeaway Box
        callout_data = [
            [Paragraph(f"<b>Key Takeaway:</b> {data.summary.headline}", headline_style)],
            [Paragraph(data.summary.subheadline, body_style)]
        ]
        callout_table = Table(callout_data, colWidths=[540])
        callout_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#fff7ed')),
            ('BOX', (0, 0), (-1, -1), 1, colors.HexColor('#fdba74')),
            ('PADDING', (0, 0), (-1, -1), 10),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
        ]))
        elements.append(callout_table)
        elements.append(Spacer(1, 14))

        # Key Metrics Overview
        elements.append(Paragraph("Summary Indicators", h2_style))
        unit_str = "°F" if data.units == "fahrenheit" else "°C"
        longest_info = f"{data.summary.longest_event.duration_days} days ({data.summary.longest_event.start_date})" if data.summary.longest_event else "N/A"

        metrics_matrix = [
            ["Indicator", "Value", "Indicator", "Value"],
            ["Total Events Detected", str(data.summary.total_events), "Avg Duration", f"{data.summary.average_duration_days} days"],
            ["Total Hazard Days", str(data.summary.total_hazard_days), "Longest Event", longest_info],
            ["Threshold Level (P95)", f"{data.threshold_value} {unit_str}", "All-Time Peak", f"{data.summary.all_time_peak_value} {unit_str}"],
            ["Relative Change", f"{data.trend.percent_change_since_baseline:+0.1f}%", "Mann-Kendall Trend", data.trend.trend_direction]
        ]
        m_table = Table(metrics_matrix, colWidths=[135, 135, 135, 135])
        m_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#f1f5f9')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.HexColor('#0f172a')),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#cbd5e1')),
            ('PADDING', (0, 0), (-1, -1), 6),
        ]))
        elements.append(m_table)
        elements.append(Spacer(1, 14))

        # Statistical Trend Details
        elements.append(Paragraph("Statistical Rigor & Significance", h2_style))
        stat_matrix = [
            ["Metric", "Value", "Scientific Interpretation"],
            ["Linear Slope (OLS)", f"{data.trend.linear_slope_per_decade:+0.3f} events/decade", "Long-term decadal trajectory"],
            ["Coefficient of Determination (R²)", f"{data.trend.r_squared:.4f}", "Variance explained by linear model"],
            ["Mann-Kendall Statistic (S)", f"{data.trend.mann_kendall_s:.1f}", "Cumulative sign difference of pairs"],
            ["Standardized Z-Score", f"{data.trend.mann_kendall_z:.3f}", "Z-statistic on standard normal distribution"],
            ["Mann-Kendall p-value", f"{data.trend.mann_kendall_p:.4f}", "p < 0.05 indicates statistically significant trend"],
            ["Kendall's Tau (τ)", f"{data.trend.kendall_tau:+.3f}", "Non-parametric rank correlation"],
            ["Sen's Slope Estimator", f"{data.trend.sens_slope:+.4f} / yr", "Robust median slope insensitive to outliers"]
        ]
        s_table = Table(stat_matrix, colWidths=[160, 120, 260])
        s_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#f1f5f9')),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 8.5),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#cbd5e1')),
            ('PADDING', (0, 0), (-1, -1), 5),
        ]))
        elements.append(s_table)
        elements.append(Spacer(1, 14))

        # Top 5 Most Severe Detected Events
        elements.append(Paragraph("Top Severe / Extreme Events Recorded", h2_style))
        sorted_events = sorted(data.events, key=lambda e: (e.duration_days, e.peak_value), reverse=True)[:5]
        events_matrix = [
            ["Start Date", "End Date", "Duration", f"Peak ({unit_str})", "Severity", "Intensity Score"]
        ]
        for ev in sorted_events:
            events_matrix.append([
                ev.start_date,
                ev.end_date,
                f"{ev.duration_days} days",
                str(ev.peak_value),
                ev.severity,
                str(ev.intensity_score)
            ])

        if len(events_matrix) == 1:
            events_matrix.append(["None", "None", "0 days", "-", "-", "-"])

        e_table = Table(events_matrix, colWidths=[90, 90, 80, 80, 100, 100])
        e_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#f1f5f9')),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 8.5),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#cbd5e1')),
            ('PADDING', (0, 0), (-1, -1), 5),
        ]))
        elements.append(e_table)
        elements.append(Spacer(1, 14))

        # Footer / Methodology Note
        elements.append(Paragraph(
            "<b>Methodology Note:</b> Data ingested from Open-Meteo ERA5 atmospheric reanalysis (0.25° spatial resolution). "
            "Heatwave threshold defined as the 95th percentile of daily maximum temperatures with clustering across >= 3 consecutive days "
            "as per World Meteorological Organization (WMO) guidelines.",
            ParagraphStyle('Methodology', parent=styles['Normal'], fontSize=7.5, leading=10, textColor=colors.HexColor('#94a3b8'))
        ))

        doc.build(elements)
        buffer.seek(0)
        return buffer.getvalue()


report_generator = ReportGenerator()
