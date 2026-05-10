import React from 'react';
import Routing from './Routing';
import ErrorBoundary from './components/ErrorBoundary';

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <Routing />
    </ErrorBoundary>
  );
};

export default App;