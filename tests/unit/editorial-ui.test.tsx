import {describe,it,expect,vi,beforeEach} from 'vitest'
import {render,screen,fireEvent,waitFor} from '@testing-library/react'
import {LocaleProvider} from '../../src/shared/i18n'
import {RouterProvider} from '../../src/app/router'
import {EditorPage} from '../../src/features/editorial/EditorPage'
import {SubmitStoryPage} from '../../src/features/operations/SubmitStoryPage'
const fake=vi.hoisted(()=>({isAdmin:false,session:null as any}));
vi.mock('../../src/features/account/AuthProvider',()=>({useAuth:()=>({...fake,loading:false,error:false,refreshRole:async()=>{}})}))
vi.mock('../../src/features/editorial/editorial.api',()=>({listDrafts:async()=>({drafts:[]}),saveDraft:async()=>{throw new Error('offline')},publishDraft:async()=>({}),loadDraft:async()=>({})}))
vi.mock('../../src/data',()=>({getAdminArticles:async()=>[],getCategories:async()=>[]}))
function wrap(component:React.ReactNode){return render(<LocaleProvider><RouterProvider>{component}</RouterProvider></LocaleProvider>)}
beforeEach(()=>{localStorage.clear();fake.isAdmin=false;fake.session=null})
describe('editorial access and local draft',()=>{
 it('does not expose the editor or publish controls to a guest',()=>{wrap(<EditorPage onPublished={()=>{}}/>);expect(screen.queryByRole('button',{name:/publish/i})).not.toBeInTheDocument();expect(screen.getByRole('link',{name:/sign in/i})).toBeInTheDocument()})
 it('blocks a signed-in ordinary account',()=>{fake.session={user:{id:'user'}};wrap(<EditorPage onPublished={()=>{}}/>);expect(screen.getByRole('heading',{name:/administrator/i})).toBeInTheDocument();expect(screen.queryByRole('button',{name:/new article/i})).not.toBeInTheDocument()})
 it('preserves draft text across editing languages and does not show a false saved state',async()=>{fake.session={user:{id:'admin'}};fake.isAdmin=true;wrap(<EditorPage onPublished={()=>{}}/>);fireEvent.click(await screen.findByRole('button',{name:/new article/i}));fireEvent.change(screen.getByLabelText('Title'),{target:{value:'Local English headline'}});fireEvent.click(screen.getByRole('button',{name:'FR'}));fireEvent.change(screen.getByLabelText('Title'),{target:{value:'French headline'}});fireEvent.click(screen.getByRole('button',{name:'EN'}));expect(screen.getByLabelText('Title')).toHaveValue('Local English headline');fireEvent.click(screen.getByRole('button',{name:/save draft/i}));await waitFor(()=>expect(screen.getByRole('alert')).toBeInTheDocument());expect(screen.queryByText('Private draft saved')).not.toBeInTheDocument()})
 it('requires an account for a private article submission',()=>{wrap(<SubmitStoryPage/>);expect(screen.queryByRole('textbox',{name:'Story'})).not.toBeInTheDocument();expect(screen.getByRole('link',{name:/sign in/i})).toBeInTheDocument()})
})
