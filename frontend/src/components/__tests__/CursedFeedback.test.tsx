// Tests for CursedFeedback component - issue display and severity visualization

import { render, screen, fireEvent } from '@/test/test-utils';
import { describe, it, expect } from 'vitest';
import { CursedFeedback } from '../CursedFeedback';

describe('CursedFeedback Component', () => {
  const mockCode = `function example() {
  console.log('test');
  return true;
}`;

  const mockIssues = [
    {
      id: 'issue-1',
      severity: 'minor' as const,
      lineNumber: 2,
      columnNumber: 3,
      demonicMessage: '👻 This console.log is haunting your code!',
      technicalExplanation: 'Console statements should be removed in production code.',
      ruleId: 'no-console',
    },
    {
      id: 'issue-2',
      severity: 'moderate' as const,
      lineNumber: 3,
      columnNumber: 5,
      demonicMessage: '🕷️ Your variable naming is moderately cursed!',
      technicalExplanation: 'Variable names should be descriptive and follow naming conventions.',
      ruleId: 'naming-convention',
    },
    {
      id: 'issue-3',
      severity: 'critical' as const,
      lineNumber: 3,
      columnNumber: 10,
      demonicMessage: '💀 Your return statement is cursed!',
      technicalExplanation: 'This return statement has a critical issue.',
      ruleId: 'critical-return',
      hauntedPatch: {
        id: 'patch-1',
        issueId: 'issue-3',
        originalCode: 'return true;',
        cursedCode: 'return false;',
        explanation: 'Fixed the return value',
        confidence: 0.95,
      },
    },
  ];

  describe('Issue Display', () => {
    it('should render all issues', () => {
      render(
        <CursedFeedback
          issues={mockIssues}
          code={mockCode}
          language="javascript"
          overallCurseLevel={50}
        />
      );

      expect(screen.getByText(/This console.log is haunting your code/i)).toBeInTheDocument();
      expect(screen.getByText(/Your variable naming is moderately cursed/i)).toBeInTheDocument();
      expect(screen.getByText(/Your return statement is cursed/i)).toBeInTheDocument();
    });

    it('should render minor severity issues correctly', () => {
      const minorIssue = [mockIssues[0]];
      render(
        <CursedFeedback
          issues={minorIssue}
          code={mockCode}
          language="javascript"
          overallCurseLevel={20}
        />
      );

      expect(screen.getByText('MINOR')).toBeInTheDocument();
      const ghostIcons = screen.getAllByText('👻');
      expect(ghostIcons.length).toBeGreaterThan(0);
      expect(screen.getByText(/This console.log is haunting your code/i)).toBeInTheDocument();
    });

    it('should render moderate severity issues correctly', () => {
      const moderateIssue = [mockIssues[1]];
      render(
        <CursedFeedback
          issues={moderateIssue}
          code={mockCode}
          language="javascript"
          overallCurseLevel={50}
        />
      );

      expect(screen.getByText('MODERATE')).toBeInTheDocument();
      const spiderIcons = screen.getAllByText('🕷️');
      expect(spiderIcons.length).toBeGreaterThan(0);
      expect(screen.getByText(/Your variable naming is moderately cursed/i)).toBeInTheDocument();
    });

    it('should render critical severity issues correctly', () => {
      const criticalIssue = [mockIssues[2]];
      render(
        <CursedFeedback
          issues={criticalIssue}
          code={mockCode}
          language="javascript"
          overallCurseLevel={85}
        />
      );

      expect(screen.getByText('CRITICAL')).toBeInTheDocument();
      const skullIcons = screen.getAllByText('💀');
      expect(skullIcons.length).toBeGreaterThan(0);
      expect(screen.getByText(/Your return statement is cursed/i)).toBeInTheDocument();
    });

    it('should display severity badges for all severity levels', () => {
      render(
        <CursedFeedback
          issues={mockIssues}
          code={mockCode}
          language="javascript"
          overallCurseLevel={50}
        />
      );

      expect(screen.getByText('MINOR')).toBeInTheDocument();
      expect(screen.getByText('MODERATE')).toBeInTheDocument();
      expect(screen.getByText('CRITICAL')).toBeInTheDocument();
    });

    it('should show line numbers for all issues', () => {
      render(
        <CursedFeedback
          issues={mockIssues}
          code={mockCode}
          language="javascript"
          overallCurseLevel={50}
        />
      );

      expect(screen.getByText(/Line 2:3/i)).toBeInTheDocument();
      expect(screen.getByText(/Line 3:5/i)).toBeInTheDocument();
      expect(screen.getByText(/Line 3:10/i)).toBeInTheDocument();
    });

    it('should display rule IDs for issues', () => {
      render(
        <CursedFeedback
          issues={mockIssues}
          code={mockCode}
          language="javascript"
          overallCurseLevel={50}
        />
      );

      expect(screen.getByText('no-console')).toBeInTheDocument();
      expect(screen.getByText('naming-convention')).toBeInTheDocument();
      expect(screen.getByText('critical-return')).toBeInTheDocument();
    });

    it('should display no issues message when empty', () => {
      render(
        <CursedFeedback
          issues={[]}
          code={mockCode}
          language="javascript"
          overallCurseLevel={0}
        />
      );

      expect(screen.getByText(/No Curses Detected/i)).toBeInTheDocument();
      expect(screen.getByText(/Your code is clean and blessed/i)).toBeInTheDocument();
    });
  });

  describe('Severity Visualization', () => {
    it('should display curse level meter', () => {
      render(
        <CursedFeedback
          issues={mockIssues}
          code={mockCode}
          language="javascript"
          overallCurseLevel={75}
        />
      );

      expect(screen.getByText('🔮 Overall Curse Level')).toBeInTheDocument();
      expect(screen.getByText('75%')).toBeInTheDocument();
    });

    it('should show issue count summary with all severity types', () => {
      render(
        <CursedFeedback
          issues={mockIssues}
          code={mockCode}
          language="javascript"
          overallCurseLevel={50}
        />
      );

      expect(screen.getByText(/1 Minor/i)).toBeInTheDocument();
      expect(screen.getByText(/1 Moderate/i)).toBeInTheDocument();
      expect(screen.getByText(/1 Critical/i)).toBeInTheDocument();
    });

    it('should display appropriate message for low curse level', () => {
      render(
        <CursedFeedback
          issues={mockIssues}
          code={mockCode}
          language="javascript"
          overallCurseLevel={20}
        />
      );

      expect(screen.getByText(/Minor hauntings detected/i)).toBeInTheDocument();
    });

    it('should display appropriate message for moderate curse level', () => {
      render(
        <CursedFeedback
          issues={mockIssues}
          code={mockCode}
          language="javascript"
          overallCurseLevel={50}
        />
      );

      expect(screen.getByText(/Moderate curses found/i)).toBeInTheDocument();
    });

    it('should display appropriate message for high curse level', () => {
      render(
        <CursedFeedback
          issues={mockIssues}
          code={mockCode}
          language="javascript"
          overallCurseLevel={85}
        />
      );

      expect(screen.getByText(/CRITICAL POSSESSION/i)).toBeInTheDocument();
    });

    it('should display correct severity icons', () => {
      render(
        <CursedFeedback
          issues={mockIssues}
          code={mockCode}
          language="javascript"
          overallCurseLevel={50}
        />
      );

      // Check for severity icons in the summary and issues
      const ghostIcons = screen.getAllByText('👻');
      expect(ghostIcons.length).toBeGreaterThan(0);
      const spiderIcons = screen.getAllByText('🕷️');
      expect(spiderIcons.length).toBeGreaterThan(0);
      const skullIcons = screen.getAllByText('💀');
      expect(skullIcons.length).toBeGreaterThan(0);
    });
  });

  describe('Technical Explanation Toggle', () => {
    it('should show technical explanation when toggled', () => {
      render(
        <CursedFeedback
          issues={mockIssues}
          code={mockCode}
          language="javascript"
          overallCurseLevel={50}
        />
      );

      const toggleButtons = screen.getAllByText(/Show Technical Explanation/i);
      fireEvent.click(toggleButtons[0]);

      expect(screen.getByText(/Console statements should be removed/i)).toBeInTheDocument();
      expect(screen.getByText(/Hide Technical Explanation/i)).toBeInTheDocument();
    });

    it('should hide technical explanation when toggled again', () => {
      render(
        <CursedFeedback
          issues={mockIssues}
          code={mockCode}
          language="javascript"
          overallCurseLevel={50}
        />
      );

      const toggleButtons = screen.getAllByText(/Show Technical Explanation/i);
      fireEvent.click(toggleButtons[0]);
      
      expect(screen.getByText(/Console statements should be removed/i)).toBeInTheDocument();
      
      const hideButton = screen.getByText(/Hide Technical Explanation/i);
      fireEvent.click(hideButton);

      const showButtons = screen.getAllByText(/Show Technical Explanation/i);
      expect(showButtons.length).toBe(3);
    });

    it('should toggle multiple issues independently', () => {
      render(
        <CursedFeedback
          issues={mockIssues}
          code={mockCode}
          language="javascript"
          overallCurseLevel={50}
        />
      );

      const toggleButtons = screen.getAllByText(/Show Technical Explanation/i);
      
      // Toggle first issue
      fireEvent.click(toggleButtons[0]);
      expect(screen.getByText(/Console statements should be removed/i)).toBeInTheDocument();
      
      // Toggle second issue
      fireEvent.click(toggleButtons[1]);
      expect(screen.getByText(/Variable names should be descriptive/i)).toBeInTheDocument();
      
      // Both should be visible
      expect(screen.getByText(/Console statements should be removed/i)).toBeInTheDocument();
      expect(screen.getByText(/Variable names should be descriptive/i)).toBeInTheDocument();
    });

    it('should display technical details section when expanded', () => {
      render(
        <CursedFeedback
          issues={mockIssues}
          code={mockCode}
          language="javascript"
          overallCurseLevel={50}
        />
      );

      const toggleButtons = screen.getAllByText(/Show Technical Explanation/i);
      fireEvent.click(toggleButtons[0]);

      const technicalDetails = screen.getAllByText('Technical Details');
      expect(technicalDetails.length).toBeGreaterThan(0);
      const bookIcons = screen.getAllByText('📚');
      expect(bookIcons.length).toBeGreaterThan(0);
    });
  });

  describe('Code Highlighting and Display', () => {
    it('should display code snippet containers for each issue', () => {
      render(
        <CursedFeedback
          issues={mockIssues}
          code={mockCode}
          language="javascript"
          overallCurseLevel={50}
        />
      );

      // Check that code snippet containers are rendered
      const codeContainers = document.querySelectorAll('.border-2.border-phantom-purple\\/30');
      expect(codeContainers.length).toBe(mockIssues.length);
    });

    it('should show line range labels for code snippets', () => {
      render(
        <CursedFeedback
          issues={mockIssues}
          code={mockCode}
          language="javascript"
          overallCurseLevel={50}
        />
      );

      // Check for line range indicators (multiple will exist)
      const lineLabels = screen.getAllByText(/Lines 1-/i);
      expect(lineLabels.length).toBeGreaterThan(0);
    });

    it('should render code editor sections for all issues', () => {
      render(
        <CursedFeedback
          issues={mockIssues}
          code={mockCode}
          language="typescript"
          overallCurseLevel={50}
        />
      );

      // Check that editor sections are rendered (Monaco shows "Loading..." initially in tests)
      const loadingTexts = screen.getAllByText('Loading...');
      expect(loadingTexts.length).toBe(mockIssues.length);
    });

    it('should display code snippets with context lines', () => {
      const multiLineCode = `function test() {
  const x = 1;
  const y = 2;
  return x + y;
}`;
      
      render(
        <CursedFeedback
          issues={[mockIssues[0]]}
          code={multiLineCode}
          language="javascript"
          overallCurseLevel={30}
        />
      );

      // Verify code container is rendered
      const codeContainers = document.querySelectorAll('.border-2.border-phantom-purple\\/30');
      expect(codeContainers.length).toBe(1);
    });
  });

  describe('Haunted Patch Display', () => {
    it('should show haunted patch when available', () => {
      render(
        <CursedFeedback
          issues={mockIssues}
          code={mockCode}
          language="javascript"
          overallCurseLevel={50}
        />
      );

      expect(screen.getByText(/Haunted Patch Available/i)).toBeInTheDocument();
      expect(screen.getByText(/95% Confidence/i)).toBeInTheDocument();
      expect(screen.getByText(/Fixed the return value/i)).toBeInTheDocument();
    });

    it('should not show patch section for issues without patches', () => {
      render(
        <CursedFeedback
          issues={[mockIssues[0]]}
          code={mockCode}
          language="javascript"
          overallCurseLevel={30}
        />
      );

      expect(screen.queryByText(/Haunted Patch Available/i)).not.toBeInTheDocument();
    });

    it('should display patch confidence as percentage', () => {
      render(
        <CursedFeedback
          issues={mockIssues}
          code={mockCode}
          language="javascript"
          overallCurseLevel={50}
        />
      );

      expect(screen.getByText(/95% Confidence/i)).toBeInTheDocument();
    });
  });
});
