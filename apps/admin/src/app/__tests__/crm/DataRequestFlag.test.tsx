import { render, screen } from '@testing-library/react';

import { DataRequestFlag } from '@/app/(routes)/(dashboard)/crm/requests/DataRequestFlag';

describe('DataRequestFlag', () => {
  it('renders nothing for an ordinary support message', () => {
    const { container } = render(
      <DataRequestFlag
        email="vet@clinic.example"
        subject="General Enquiry"
        message="I cannot log in to my account since yesterday, can you help?"
      />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing for a sales enquiry that mentions data', () => {
    const { container } = render(
      <DataRequestFlag
        email="buyer@clinic.example"
        subject="Feature Request"
        message="Does your platform import data from our existing practice system?"
      />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('names the kind it reads and shows the phrase that matched', () => {
    render(
      <DataRequestFlag
        email="jane@example.com"
        subject="General Enquiry"
        message="Please delete my account."
      />
    );

    expect(screen.getByText(/Reads like a data request/)).toHaveTextContent('Erasure');
    expect(screen.getByText(/Matched/)).toHaveTextContent('"delete my account"');
  });

  it('links to the manual form with the email and type filled in', () => {
    render(
      <DataRequestFlag
        email="jane+dsar@example.com"
        subject={null}
        message="Please send me a copy of my data."
      />
    );

    expect(screen.getByRole('link')).toHaveAttribute(
      'href',
      '/privacy/requests?subjectEmail=jane%2Bdsar%40example.com&type=access'
    );
  });

  it('names the sender in the link so several markers stay distinguishable', () => {
    render(
      <DataRequestFlag
        email="jane@example.com"
        subject={null}
        message="Please delete my account."
      />
    );

    expect(
      screen.getByRole('link', { name: /Log it on the data-request form for jane@example.com/ })
    ).toBeInTheDocument();
  });

  it('reports every kind the message reads as, strongest first', () => {
    render(
      <DataRequestFlag
        email="jane@example.com"
        subject={null}
        message="Delete my account, forget me, and send me my data first."
      />
    );

    expect(screen.getByText(/Reads like a data request/)).toHaveTextContent('Erasure, Access');
    expect(screen.getByRole('link')).toHaveAttribute(
      'href',
      '/privacy/requests?subjectEmail=jane%40example.com&type=erasure'
    );
  });

  it('says plainly that following the link records nothing', () => {
    render(
      <DataRequestFlag
        email="jane@example.com"
        subject={null}
        message="Please delete my account."
      />
    );

    expect(screen.getByText(/Nothing is logged until you submit it/)).toBeInTheDocument();
  });

  it('reads the subject when the message alone says nothing', () => {
    render(
      <DataRequestFlag
        email="jane@example.com"
        subject="Right to be forgotten"
        message="See the subject line."
      />
    );

    expect(screen.getByText(/Reads like a data request/)).toHaveTextContent('Erasure');
  });
});
